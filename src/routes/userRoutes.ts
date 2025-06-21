/**
 * User Management Routes
 * 
 * This module defines all API endpoints for user management operations.
 * It provides a comprehensive REST API for user CRUD operations with
 * role-based access control and authentication requirements.
 * 
 * Route Categories:
 * - Profile routes: User's own profile management
 * - View routes: Reading user information (with role-based filtering)
 * - Admin routes: User management operations (admin-only)
 * 
 * Security:
 * - All routes require authentication (JWT token)
 * - Admin operations require ADMIN role
 * - Users can always access their own profile
 * - Role-based data filtering applied in controllers
 * 
 * Base URL: /api/users
 */

import { Router, RequestHandler } from 'express';
import {
    getAllUsers,      // Get paginated list of users (with role-based filtering)
    getUserById,      // Get specific user details
    createUser,       // Create new user account (admin-only)
    updateUser,       // Update existing user (admin-only)
    changeRole,       // Change user's role (admin-only)
    deleteUser,       // Delete user account (admin-only)
    getCurrentUser,   // Get current user's profile
    updateCurrentUser // Update current user's profile
} from '../controllers/userController';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';
import { Role } from '@prisma/client';

const router = Router();

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================
// All user routes require valid JWT authentication
router.use(authenticateToken as RequestHandler);

// ========================================
// PROFILE MANAGEMENT ROUTES
// ========================================
// Users can manage their own profile without additional permissions
router.get('/me', getCurrentUser as RequestHandler);           // GET /api/users/me - Get current user profile
router.put('/me', updateCurrentUser as RequestHandler);       // PUT /api/users/me - Update current user profile

// ========================================
// USER VIEW ROUTES
// ========================================
// View user information (controllers apply role-based filtering)
router.get('/', getAllUsers as RequestHandler);               // GET /api/users - Get paginated user list
router.get('/:id', getUserById as RequestHandler);            // GET /api/users/:id - Get specific user

// ========================================
// ADMIN-ONLY MANAGEMENT ROUTES
// ========================================
// These routes require ADMIN role for user management operations
router.post('/', authorizeRole([Role.ADMIN]) as RequestHandler, createUser as RequestHandler);        // POST /api/users - Create new user
router.put('/:id', authorizeRole([Role.ADMIN]) as RequestHandler, updateUser as RequestHandler);      // PUT /api/users/:id - Update user
router.patch('/:id/role', authorizeRole([Role.ADMIN]) as RequestHandler, changeRole as RequestHandler); // PATCH /api/users/:id/role - Change user role
router.delete('/:id', authorizeRole([Role.ADMIN]) as RequestHandler, deleteUser as RequestHandler);   // DELETE /api/users/:id - Delete user

export default router;
