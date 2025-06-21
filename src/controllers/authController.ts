/**
 * Authentication Controller
 * 
 * This module handles all authentication-related operations for the restaurant management system.
 * It provides secure user registration, login, password reset functionality with comprehensive
 * validation, rate limiting, and account security features.
 * 
 * Features:
 * - User registration (customers only via public signup)
 * - Secure login with JWT token generation
 * - Failed login attempt tracking and account locking
 * - Password reset with secure tokens
 * - Input validation and sanitization
 * - Security measures against brute force attacks
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import dotenv from 'dotenv';

import { comparePassword, hashPassword } from '../utils/hash';
import { generateResetToken, isTokenExpired } from '../utils/tokens';

dotenv.config();

/**
 * User Registration Handler
 * 
 * Handles new user account creation with comprehensive validation and security measures.
 * Only allows customer role registration through public signup to prevent privilege escalation.
 * 
 * Validation includes:
 * - Required field validation (username, password, email)
 * - Email format validation using regex
 * - Password strength requirements (min 8 chars, numbers, special characters)
 * - Duplicate username/email detection
 * 
 * Security measures:
 * - Password hashing using bcrypt
 * - Input sanitization (trimming whitespace)
 * - Role restriction (customers only)
 * - Case-insensitive email storage
 * 
 * @param req - Express request object containing user registration data
 * @param res - Express response object for sending registration result
 * @returns Promise<any> - Success response with user data or error message
 */
export const signup = async (req: Request, res: Response): Promise<any> => {
  const { username, password, email, role = 'CUSTOMER' } = req.body;

  // Input validation - ensure all required fields are present and not empty
  if (!username?.trim() || !password?.trim() || !email?.trim()) {
    return res.status(400).json({ message: 'Username, password and email are required' });
  }

  // Email format validation using regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  // Password strength validation - minimum 8 characters
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }

  // Password complexity validation - require at least one number and one special character
  const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: 'Password must contain at least one number and one special character' });
  }

  // Security restriction - only allow customer registrations through public signup
  if (role !== 'CUSTOMER') {
    return res.status(403).json({ message: 'Only customer registrations are allowed' });
  }

  try {
    // Check for existing users with same username or email to prevent duplicates
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.trim() },
          { email: email.trim().toLowerCase() }
        ]
      }
    });    // Return appropriate error message based on which field conflicts
    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.username === username.trim()
          ? 'Username already taken' 
          : 'Email already registered' 
      });
    }

    // Hash password securely using bcrypt before storing in database
    const hashedPassword = await hashPassword(password);
    
    // Create new user record in database with sanitized and validated data
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(), // Store email in lowercase for consistency
        password: hashedPassword,
        role: 'CUSTOMER', // Hardcode role for security
      },
      select: {
        // Only select non-sensitive fields to return to client
        id: true,
        username: true,
        email: true,
        role: true
      }
    });

    // Return success response with user data (excluding password)
    res.status(201).json({ 
      message: 'User created successfully', 
      user 
    });
  } catch (error) {
    // Log error for debugging but don't expose internal details to client
    console.error('Error in signup:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

/**
 * User Login Handler
 * 
 * Handles user authentication with security features including:
 * - Failed login attempt tracking and account locking
 * - JWT token generation with role-based claims
 * - Flexible login (username or email)
 * - Password verification using bcrypt
 * - Account lockout after 5 failed attempts for 15 minutes
 * 
 * Security features:
 * - Rate limiting via failed attempt tracking
 * - Secure password comparison
 * - JWT with expiration and specific claims
 * - Account locking mechanism
 * - Password hash never returned to client
 * 
 * @param req - Express request containing login credentials
 * @param res - Express response with JWT token and user data or error
 * @returns Promise<any> - Authentication result with token or error message
 */
export const login = async (req: Request, res: Response): Promise<any> => {
  const { username, email, password } = req.body;

  // Input validation - require either username or email, plus password
  if ((!username?.trim() && !email?.trim()) || !password?.trim()) {
    return res.status(400).json({ message: 'Username/email and password are required' });
  }

  try {
    // Normalize input - use whichever login field was provided and trim whitespace
    const loginField = username?.trim() || email?.trim();
    
    // Find user by username or email, including security-related fields
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: loginField },
          { email: loginField }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        role: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        // Security fields for account locking and password reset
        failedLoginAttempts: true,
        lastFailedLogin: true,
        lockedUntil: true,
        passwordResetToken: true,
        resetTokenExpires: true,
        lastPasswordChange: true
      }
    });

    // Return user-friendly error if account not found
    if (!user) {
      return res.status(401).json({ 
        message: 'Account not found. Please check your username and try again.' 
      });
    }

    // Check if account is currently locked due to too many failed attempts
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockedUntil.getTime() - new Date().getTime()) / (1000 * 60));
      return res.status(423).json({
        message: `Account is temporarily locked. Please try again in ${waitMinutes} minutes.`
      });
    }

    // Verify password using bcrypt comparison
    const valid = await comparePassword(password, user.password);
    if (!valid) {
      // Track failed login attempts for security
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = {
        failedLoginAttempts: failedAttempts,
        lastFailedLogin: new Date()
      };

      // Lock account after 5 failed attempts for 15 minutes
      const lockDuration = 15; // minutes
      if (failedAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + lockDuration * 60 * 1000);
      }

      // Update user record with failed attempt tracking
      await prisma.user.update({
        where: { id: user.id },        data: updateData
      });

      // Return appropriate error message with remaining attempts or lockout notice
      return res.status(401).json({ 
        message: failedAttempts >= 5 
          ? `Account locked for ${lockDuration} minutes due to too many failed attempts.`
          : `Incorrect password. ${5 - failedAttempts} attempts remaining.`
      });
    }

    // Reset failed login attempts on successful authentication
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastFailedLogin: null,
        lockedUntil: null
      }
    });

    // Generate JWT token with user claims and expiration
    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role,
        username: user.username,
        // Include branchId in token if user is assigned to a branch
        ...(user.branchId && { branchId: user.branchId })
      },
      process.env.JWT_SECRET!,
      { 
        expiresIn: '24h', // Token expires in 24 hours
        issuer: 'restaurant-management-api',
        audience: 'restaurant-management-client'
      }
    );

    // Remove password from user object before sending to client for security
    const { password: _, ...userWithoutPassword } = user;

    // Return successful authentication response with token and user data
    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    // Log error for debugging but don't expose internal details
    console.error('Error in login:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};

/**
 * Password Reset Request Handler
 * 
 * Initiates password reset process by generating secure reset token.
 * Uses time-limited tokens and prevents email enumeration attacks.
 * 
 * Security features:
 * - Secure random token generation
 * - Time-limited tokens (1 hour expiry)
 * - Email enumeration prevention (always returns success)
 * - Input validation and sanitization
 * 
 * @param req - Express request containing email address
 * @param res - Express response with reset instructions
 * @returns Promise<void> - Success message regardless of email validity
 */
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  // Validate email is provided
  if (!email?.trim()) {
    res.status(400).json({ message: 'Email is required' });
    return;
  }

  try {
    // Look up user by email (case-insensitive)
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      // Return success even if user not found to prevent email enumeration attacks
      res.json({ message: 'If your email is registered, you will receive reset instructions.' });
      return;
    }

    // Generate secure random reset token
    const resetToken = generateResetToken();
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Store reset token and expiry in user record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        resetTokenExpires
      }
    });

    // TODO: Send email with reset token
    // For development, return token in response (remove in production!)
    res.json({ 
      message: 'Reset instructions sent to your email.',
      // Remove this debug info in production:
      debug: { resetToken, expires: resetTokenExpires }
    });
  } catch (error) {
    // Log error for debugging
    console.error('Error in requestPasswordReset:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
};

/**
 * Password Reset Handler
 * 
 * Completes password reset process using secure token validation.
 * Updates user password and clears reset tokens and security flags.
 * 
 * Security features:
 * - Token validation and expiry checking
 * - Password strength validation
 * - Password hashing before storage
 * - Reset token cleanup
 * - Failed login attempt reset
 * - Account unlock on successful reset
 * 
 * @param req - Express request containing reset token and new password
 * @param res - Express response with reset confirmation
 * @returns Promise<void> - Success or error message
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;

  // Validate required fields
  if (!token?.trim() || !newPassword?.trim()) {
    res.status(400).json({ message: 'Token and new password are required' });
    return;
  }

  try {
    // Find user with matching reset token
    const user = await prisma.user.findFirst({
      where: { passwordResetToken: token }
    });

    // Validate token exists and hasn't expired
    if (!user || !user.resetTokenExpires || isTokenExpired(user.resetTokenExpires)) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    // Validate new password strength - minimum 8 characters
    if (newPassword.length < 8) {
      res.status(400).json({ message: 'Password must be at least 8 characters long' });
      return;
    }

    // Validate password complexity requirements
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400).json({ 
        message: 'Password must contain at least one number and one special character' 
      });
      return;
    }

    // Hash new password securely
    const hashedPassword = await hashPassword(newPassword);

    // Update user with new password and clear security flags
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null, // Clear reset token
        resetTokenExpires: null,  // Clear token expiry
        lastPasswordChange: new Date(), // Track password change time
        failedLoginAttempts: 0,   // Reset failed attempts
        lockedUntil: null         // Unlock account if it was locked
      }
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    // Log error for debugging
    console.error('Error in resetPassword:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};