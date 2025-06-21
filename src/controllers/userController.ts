/**
 * User Management Controller
 * 
 * This module handles all user-related operations for the restaurant management system.
 * It provides comprehensive user management capabilities with role-based access control,
 * pagination, validation, and security features.
 * 
 * Features:
 * - User CRUD operations (Create, Read, Update, Delete)
 * - Role-based access control and filtering
 * - Pagination for user lists
 * - Current user profile management
 * - Branch-based user filtering for managers
 * - Password hashing and security
 * - Input validation and error handling
 * 
 * Access Control:
 * - ADMIN: Can manage all users across all branches
 * - GENERAL_MANAGER: Can view all users but with restricted modifications
 * - BRANCH_MANAGER: Can only manage users within their assigned branch
 * - Other roles: Limited to viewing users in their branch
 */

import { Response } from 'express';
import { handleError } from '../utils/errorHandler';
import prisma from '../utils/prisma';
import { Role } from '@prisma/client';
import { hashPassword } from '../utils/hash';
import { AuthRequest, AuthRequestHandler, UserUpdateRequest } from '../types/auth';
import { Prisma } from '@prisma/client';

/**
 * Get All Users with Pagination and Role-Based Filtering
 * 
 * Retrieves a paginated list of users with access control based on the requesting user's role.
 * Different roles have different levels of access to user data:
 * 
 * Access Levels:
 * - ADMIN: Can view all users across all branches
 * - GENERAL_MANAGER: Can view all users (but may have limited modification rights)
 * - BRANCH_MANAGER/Staff: Can only view users within their assigned branch
 * 
 * Features:
 * - Pagination with configurable page size
 * - Role-based filtering
 * - Branch information included in response
 * - Total count and pagination metadata
 * 
 * @param req - Authenticated request with user context and query parameters
 * @param res - Response with paginated user list and metadata
 * @returns Promise<void> - Paginated user data or error
 */
export const getAllUsers: AuthRequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Extract pagination parameters from query string with defaults
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build query filter based on requesting user's role and access level
        const whereClause = req.user.role === 'ADMIN' ? {} :           // Admins see all users
                          req.user.role === 'GENERAL_MANAGER' ? {} :   // GMs see all users
                          { branchId: req.user.branchId };             // Others see only their branch

        // Fetch users and total count in parallel for better performance
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where: whereClause,
                skip,
                take: limit,
                select: {
                    // Select only safe fields (exclude sensitive data like passwords)
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                    branchId: true,
                    createdAt: true,
                    branch: {
                        select: {
                            name: true // Include branch name for display
                        }
                    }
                }
            }),
            prisma.user.count({ where: whereClause })
        ]);

        // Return paginated response with metadata
        res.json({
            users,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                current: page,
                perPage: limit
            }
        });    } catch (error) {
        // Use centralized error handler for consistent error responses
        handleError(error, res);
    }
};

/**
 * Get User by ID with Access Control
 * 
 * Retrieves detailed information for a specific user with role-based access control.
 * Users can only view user details within their access scope based on their role.
 * 
 * Access Control:
 * - ADMIN/GENERAL_MANAGER: Can view any user
 * - BRANCH_MANAGER/Staff: Can only view users in their branch
 * 
 * @param req - Authenticated request with user ID parameter
 * @param res - Response with user details or error
 * @returns Promise<void> - User data or error message
 */
export const getUserById: AuthRequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const parsedId = parseInt(id);

        // Validate user ID format
        if (isNaN(parsedId)) {
            res.status(400).json({ message: 'Invalid user ID' });
            return;
        }

        // Fetch user with safe fields only
        const user = await prisma.user.findUnique({
            where: { id: parsedId },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                branchId: true,
                createdAt: true,
                branch: {
                    select: {
                        name: true // Include branch name for context
                    }
                }
            }
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Check if requesting user has permission to view this user
        if (req.user.role !== 'ADMIN' && 
            req.user.role !== 'GENERAL_MANAGER' && 
            user.branchId !== req.user.branchId) {
            res.status(403).json({ message: 'Unauthorized to view this user' });
            return;
        }

        res.json(user);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Create New User
 * 
 * Creates a new user account with role assignment and optional branch association.
 * Only authorized users (typically admins) can create new user accounts.
 * 
 * Security Features:
 * - Password hashing before storage
 * - Required field validation
 * - Role validation
 * - Branch association
 * - Creator tracking for audit purposes
 * 
 * @param req - Authenticated request with new user data
 * @param res - Response with created user data or error
 * @returns Promise<void> - Created user data or error message
 */
export const createUser: AuthRequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { username, email, password, role, branchId } = req.body as UserUpdateRequest;

        // Validate required fields
        if (!username || !email || !password || !role) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        // Hash password securely before storing
        const hashedPassword = await hashPassword(password);

        // Prepare user data for creation
        const userData: Prisma.UserCreateInput = {
            username,
            email,
            password: hashedPassword,
            role,
            createdBy: { connect: { id: req.user.id } }, // Track who created this user
            // Conditionally connect to branch if branchId is provided
            ...(branchId && {
                branch: { connect: { id: branchId } }
            })
        };

        // Create user and return safe fields only
        const user = await prisma.user.create({
            data: userData,
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                branchId: true,
                createdAt: true
            }
        });

        res.status(201).json(user);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Update User Information
 * 
 * Updates existing user information with partial data support.
 * Only provided fields are updated, allowing for flexible partial updates.
 * 
 * Security Features:
 * - Password hashing if password is being updated
 * - ID validation
 * - Branch relationship management (connect/disconnect)
 * - Selective field updates
 * 
 * @param req - Authenticated request with user ID and update data
 * @param res - Response with updated user data or error
 * @returns Promise<void> - Updated user data or error message
 */
export const updateUser: AuthRequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const parsedId = parseInt(id);
        const { username, email, password, role, branchId } = req.body as UserUpdateRequest;

        // Validate user ID format
        if (isNaN(parsedId)) {
            res.status(400).json({ message: 'Invalid user ID' });
            return;        }

        // Build update data object with only provided fields
        const updateData: Prisma.UserUpdateInput = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (password) updateData.password = await hashPassword(password); // Hash password if provided
        if (role) updateData.role = role;
        
        // Handle branch relationship - connect to new branch or disconnect if branchId is null
        if (branchId !== undefined) {
            updateData.branch = branchId ? { connect: { id: branchId } } : { disconnect: true };
        }

        // Update user and return safe fields
        const user = await prisma.user.update({
            where: { id: parsedId },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                branchId: true,
                createdAt: true
            }
        });

        res.json(user);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Change User Role
 * 
 * Updates a user's role with validation to ensure only valid roles are assigned.
 * This is a specialized endpoint for role management with enhanced validation.
 * 
 * Security Features:
 * - Role validation against system-defined roles
 * - ID validation
 * - Selective response data (only essential fields)
 * 
 * @param req - Authenticated request with user ID and new role
 * @param res - Response with updated user role or error
 * @returns Promise<void> - Updated user data or error message
 */
export const changeRole: AuthRequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const parsedId = parseInt(id);

        // Validate user ID format
        if (isNaN(parsedId)) {
            res.status(400).json({ message: 'Invalid user ID' });
            return;
        }

        // Validate role is one of the allowed system roles
        if (!Object.values(Role).includes(role)) {
            res.status(400).json({ message: 'Invalid role' });
            return;
        }

        // Update user role and return essential fields
        const user = await prisma.user.update({
            where: { id: parsedId },
            data: { role },
            select: {
                id: true,
                username: true,
                role: true
            }
        });

        res.json(user);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Delete User
 * 
 * Permanently removes a user from the system. This is a destructive operation
 * that should be used with caution and proper authorization.
 * 
 * Security Considerations:
 * - Permanent deletion (consider soft delete for audit trails)
 * - ID validation
 * - No response body (204 status indicates success)
 * 
 * @param req - Authenticated request with user ID to delete
 * @param res - Empty response with 204 status or error
 * @returns Promise<void> - Success (no content) or error message
 */
export const deleteUser: AuthRequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const parsedId = parseInt(id);

        // Validate user ID format
        if (isNaN(parsedId)) {
            res.status(400).json({ message: 'Invalid user ID' });
            return;
        }

        // Permanently delete user from database
        await prisma.user.delete({
            where: { id: parsedId }
        });

        // Return 204 No Content to indicate successful deletion
        res.status(204).send();
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Get Current User Profile
 * 
 * Retrieves the profile information for the currently authenticated user.
 * This endpoint allows users to view their own profile data including
 * branch information and account details.
 * 
 * Features:
 * - Automatic user identification from JWT token
 * - Branch information included
 * - Safe field selection (no sensitive data)
 * - Debug logging for troubleshooting
 * 
 * @param req - Authenticated request with user context from JWT
 * @param res - Response with current user profile or error
 * @returns Promise<void> - Current user data or error message
 */
export const getCurrentUser: AuthRequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Debug logging to help troubleshoot authentication issues
        console.log('getCurrentUser req.user:', req.user);
        
        // Fetch current user's profile with branch information
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                branchId: true,
                createdAt: true,
                updatedAt: true,
                branch: {
                  select: { name: true } // Include branch name for display
                }
            }
        });
        
        console.log('getCurrentUser prisma.user:', user);
        
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        
        res.json(user);
        console.log('getCurrentUser response sent:', user);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Update Current User Profile
 * 
 * Allows the currently authenticated user to update their own profile information.
 * Users can modify their username, email, and password through this endpoint.
 * 
 * Security Features:
 * - Password hashing if password is being updated
 * - Partial updates (only provided fields are updated)
 * - Safe field selection in response
 * - User can only update their own profile
 * 
 * @param req - Authenticated request with profile update data
 * @param res - Response with updated profile or error
 * @returns Promise<void> - Updated user profile or error message
 */
export const updateCurrentUser: AuthRequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { username, email, password } = req.body;
        
        // Build update data object with only provided fields
        const updateData: any = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (password) updateData.password = await hashPassword(password); // Hash password if provided
        
        // Update current user's profile
        const user = await prisma.user.update({
            where: { id: req.user.id }, // Use authenticated user's ID
            data: updateData,
            select: {
                // Return safe fields only
                id: true,
                username: true,
                email: true,
                role: true,
                branchId: true,
                createdAt: true,
                updatedAt: true,
                branch: {
                    select: { name: true }
                }
            }
        });
        
        res.json(user);
    } catch (error) {
        handleError(error, res);
    }
};
