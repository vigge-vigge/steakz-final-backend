/**
 * Authentication Routes
 * 
 * This module defines all public authentication-related API endpoints.
 * These routes handle user registration, login, and password reset operations
 * without requiring authentication (they are publicly accessible).
 * 
 * Routes:
 * - POST /auth/signup - New user registration (customers only)
 * - POST /auth/login - User authentication and JWT token generation
 * - POST /auth/request-reset - Initiate password reset process
 * - POST /auth/reset-password - Complete password reset with token
 * 
 * Security Notes:
 * - These endpoints are intentionally public
 * - Rate limiting should be implemented at the server level
 * - Input validation is handled in the controllers
 * - Password reset uses secure token validation
 */

import express from 'express';
import { signup, login, requestPasswordReset, resetPassword } from '../controllers/authController';
import { RequestHandler } from 'express';

const router = express.Router();

// Public authentication endpoints (no authentication required)
router.post('/signup', signup as RequestHandler);              // User registration
router.post('/login', login as RequestHandler);                // User authentication
router.post('/request-reset', requestPasswordReset as RequestHandler); // Password reset request
router.post('/reset-password', resetPassword as RequestHandler);       // Password reset completion

export default router;
