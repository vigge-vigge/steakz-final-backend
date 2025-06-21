/**
 * Authentication and Authorization Type Definitions
 * 
 * This module contains comprehensive TypeScript type definitions for all
 * authentication and authorization-related functionality in the restaurant
 * management system. These types ensure type safety and better development
 * experience across the entire authentication flow.
 * 
 * Type Categories:
 * - JWT Token Types: For token payload and validation
 * - User Authentication Types: For request/response handling
 * - Request Handler Types: For type-safe middleware and controllers
 * - Request/Response Body Types: For API endpoint data structures
 * - Pagination Types: For list endpoints with pagination
 * 
 * Benefits:
 * - Type safety across the entire auth system
 * - Better IDE autocomplete and error detection
 * - Self-documenting code through type definitions
 * - Consistent data structures across endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { JwtPayload as JwtPayloadBase } from 'jsonwebtoken';
import { ParamsDictionary } from 'express-serve-static-core';

/**
 * JWT Token Payload Interface
 * 
 * Extends the base JWT payload with application-specific claims.
 * This interface defines what data is stored in JWT tokens.
 */
export interface JwtPayload extends JwtPayloadBase {
    userId: number;        // Unique user identifier
    role: Role;           // User's role for authorization
    branchId?: number;    // Optional branch assignment for branch-specific users
}

/**
 * Authenticated User Context
 * 
 * Represents the authenticated user information attached to requests
 * after successful JWT token validation.
 */
export interface AuthenticatedUser {
    id: number;           // User's unique identifier
    role: Role;          // User's role for authorization checks
    branchId?: number;   // Optional branch assignment
}

/**
 * Authenticated Request Type
 * 
 * Extends Express Request to include authenticated user information.
 * This ensures type safety when accessing user data in authenticated endpoints.
 */
export type AuthRequest<
    P = ParamsDictionary,  // URL parameters
    ResBody = any,         // Response body type
    ReqBody = any,         // Request body type
    ReqQuery = any         // Query parameters
> = Request<P, ResBody, ReqBody, ReqQuery> & {
    user: AuthenticatedUser;  // Guaranteed to exist after authentication
};

/**
 * Authenticated Request Handler Type
 * 
 * Type-safe request handler for authenticated endpoints.
 * Ensures user context is available and properly typed.
 */
export type AuthRequestHandler<
    P = ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = any
> = (
    req: AuthRequest<P, ResBody, ReqBody, ReqQuery>,
    res: Response,
    next: NextFunction
) => Promise<void> | void;

// ========================================
// Request Body Type Definitions
// ========================================

/**
 * User Registration Request Body
 */
export interface SignupRequest {
    username: string;     // Desired username
    password: string;     // Plain text password (will be hashed)
    email: string;        // User's email address
    role?: Role;         // Optional role (defaults to CUSTOMER for public signup)
}

/**
 * User Login Request Body
 */
export interface LoginRequest {
    username: string;     // Username or email for login
    password: string;     // Plain text password for verification
}

/**
 * User Update Request Body
 * 
 * All fields are optional to support partial updates.
 */
export interface UserUpdateRequest {
    username?: string;    // New username
    email?: string;       // New email address
    password?: string;    // New password (will be hashed)
    role?: Role;         // New role assignment
    branchId?: number;   // New branch assignment (null to unassign)
}

// ========================================
// Response Type Definitions
// ========================================

/**
 * Authentication Success Response
 * 
 * Returned after successful login with JWT token and user data.
 */
export interface AuthResponse {
    token: string;        // JWT token for subsequent requests
    user: {
        id: number;
        username: string;
        email: string;
        role: Role;
        branchId?: number;
    };
}

/**
 * Paginated Response Type
 * 
 * Generic type for endpoints that return paginated data.
 */
export interface PaginatedResponse<T> {
    data: T[];           // Array of items for current page
    pagination: {
        total: number;    // Total number of items across all pages
        pages: number;    // Total number of pages
        current: number;  // Current page number
        perPage: number;  // Items per page
    };
}
