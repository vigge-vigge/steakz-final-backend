/**
 * Authentication and Authorization Middleware
 * 
 * This module provides comprehensive middleware functions for securing API endpoints
 * in the restaurant management system. It handles JWT token validation, role-based
 * access control, and branch-specific access restrictions.
 * 
 * Features:
 * - JWT token authentication and validation
 * - Role-based authorization (RBAC)
 * - Branch-specific access control
 * - Type-safe request extensions
 * - Comprehensive error handling
 * - Debug logging for troubleshooting
 * 
 * Middleware Functions:
 * - authenticateToken: Validates JWT tokens and extracts user information
 * - authorizeRole: Restricts access based on user roles
 * - authorizeRoles: Alternative role authorization with flexible role arrays
 * - authorizeBranchAccess: Controls access to branch-specific resources
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Role } from '@prisma/client';
import { JwtPayload, AuthenticatedUser } from '../types/auth';

/**
 * Extend Express Request type to include authenticated user information
 * This allows TypeScript to understand that req.user exists after authentication
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: Role;
        branchId?: number;
      };
    }
  }
}

dotenv.config();

/**
 * JWT Token Authentication Middleware
 * 
 * Validates JWT tokens from request headers and extracts user information.
 * This middleware must be applied to all protected routes to ensure only
 * authenticated users can access them.
 * 
 * Process:
 * 1. Extract token from Authorization header (Bearer format)
 * 2. Verify token signature and expiration
 * 3. Validate token payload structure and data types
 * 4. Attach user information to request object
 * 5. Pass control to next middleware or route handler
 * 
 * Security Features:
 * - Token signature verification
 * - Token expiration checking
 * - Payload validation
 * - Type checking for user ID and role
 * - Error handling for various failure scenarios
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next middleware function
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  // Extract token from Authorization header (format: "Bearer <token>")
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  // Check if token is provided
  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  try {
    // Verify and decode JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    console.log('Decoded JWT:', decoded);
    const { userId, role, branchId } = decoded;

    // Validate user ID from token payload
    if (!userId || typeof userId !== 'number' || isNaN(userId) || !isFinite(userId)) {
      res.status(401).json({ message: 'Invalid userId in token' });
      return;
    }

    // Validate role from token payload
    if (!role || !Object.values(Role).includes(role)) {
      res.status(401).json({ message: 'Invalid or missing role in token' });
      return;
    }

    // Attach authenticated user information to request object
    req.user = {
      id: userId,
      role,
      // Include branchId if present in token (for branch-specific users)
      ...(branchId && { branchId }),
    };
    console.log('req.user set by middleware:', req.user);
    
    // Continue to next middleware or route handler
    next();
  } catch (err) {
    // Handle JWT verification errors (expired, invalid signature, etc.)
    const error = err as Error;
    res.status(401).json({ message: 'Invalid or expired token', error: error.message });
  }
};

/**
 * Role-Based Authorization Middleware
 * 
 * Restricts access to endpoints based on user roles. This middleware should be
 * used after authenticateToken to ensure only users with specific roles can
 * access certain functionality.
 * 
 * Usage Example:
 * app.get('/admin', authenticateToken, authorizeRole(['ADMIN']), handler);
 * app.get('/management', authenticateToken, authorizeRole(['ADMIN', 'GENERAL_MANAGER']), handler);
 * 
 * @param roles - Array of roles that are allowed to access the endpoint
 * @returns Middleware function that checks user role against allowed roles
 */
export const authorizeRole = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if user is authenticated and has a valid role
    if (!req.user || !req.user.role) {
      res.status(403).json({ 
        message: `Access denied. Authentication required.`
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
      return;
    }
    
    next();
  };
};

/**
 * Alternative Role Authorization Middleware
 * 
 * Similar to authorizeRole but with a different implementation approach.
 * Provides role-based access control with string array input.
 * 
 * @param roles - Array of role strings that are allowed access
 * @returns Middleware function for role-based authorization
 */
export function authorizeRoles(roles: string[]) {
  return (req: any, res: Response, next: NextFunction) => {
    // Check if authenticated user has one of the required roles
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    next();
  };
}

/**
 * Branch-Specific Access Control Middleware
 * 
 * Enforces branch-level access restrictions to ensure users can only access
 * data and perform operations within their assigned branch scope.
 * 
 * Access Rules:
 * - ADMIN: Can access all branches (full system access)
 * - GENERAL_MANAGER: Can access all branches (full operational access)
 * - BRANCH_MANAGER/Staff: Can only access their assigned branch
 * 
 * The middleware looks for branch ID in either:
 * - URL parameters (req.params.branchId)
 * - Request body (req.body.branchId)
 * 
 * Usage Example:
 * app.get('/branches/:branchId/reports', authenticateToken, authorizeBranchAccess(), handler);
 * 
 * @returns Middleware function that enforces branch access control
 */
export const authorizeBranchAccess = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthenticatedUser;
    const requestedBranchId = Number(req.params['branchId'] || req.body['branchId']);

    // Validate that a branch ID is provided in the request
    if (!requestedBranchId) {
      res.status(400).json({ message: 'Branch ID is required' });
      return;
    }

    // Admin and General Manager have unrestricted access to all branches
    if (user.role === 'ADMIN' || user.role === 'GENERAL_MANAGER') {
      next();
      return;
    }

    // Branch staff can only access their assigned branch
    if (!user.branchId || user.branchId !== requestedBranchId) {
      res.status(403).json({ 
        message: 'Access denied. You can only access your assigned branch.' 
      });
      return;
    }

    // User has valid access to the requested branch
    next();
  };
};
