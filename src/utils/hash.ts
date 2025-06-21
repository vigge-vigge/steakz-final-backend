/**
 * Password Hashing Utilities
 * 
 * This module provides secure password hashing and comparison functionality
 * using bcrypt, a popular and secure hashing algorithm designed specifically
 * for password storage.
 * 
 * Security Features:
 * - Uses bcrypt with salt rounds for adaptive hashing
 * - Salt rounds set to 10 (good balance of security and performance)
 * - Async operations to prevent blocking
 * - Secure comparison that prevents timing attacks
 * 
 * Bcrypt Benefits:
 * - Automatically handles salt generation
 * - Adaptive cost (salt rounds can be increased as hardware improves)
 * - Resistant to rainbow table attacks
 * - Time-constant comparison function
 */

import bcrypt from 'bcrypt';

/**
 * Hash Password Securely
 * 
 * Generates a secure hash of the provided password using bcrypt with salt.
 * The salt rounds parameter controls the computational cost of hashing,
 * with higher values providing more security but requiring more processing time.
 * 
 * @param password - Plain text password to hash
 * @returns Promise<string> - Secure hash of the password including salt
 */
export const hashPassword = async (password: string): Promise<string> => {
    const saltRounds = 10; // Computational cost factor (2^10 = 1024 iterations)
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

/**
 * Compare Password Against Hash
 * 
 * Securely compares a plain text password against a stored hash.
 * Uses bcrypt's built-in comparison function which handles salt extraction
 * and provides constant-time comparison to prevent timing attacks.
 * 
 * @param password - Plain text password to verify
 * @param hashedPassword - Stored hash to compare against
 * @returns Promise<boolean> - True if password matches hash, false otherwise
 */
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
}
