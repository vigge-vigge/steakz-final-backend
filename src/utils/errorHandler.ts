/**
 * Centralized Error Handling Utility
 * 
 * This module provides a centralized error handling function that can be used
 * across all controllers to ensure consistent error responses and logging.
 * 
 * Features:
 * - Consistent error response format
 * - Error logging for debugging
 * - Security by not exposing internal error details to clients
 * - Standardized HTTP status codes
 * 
 * Future Enhancements:
 * - Different error types handling (validation, database, network, etc.)
 * - Error severity levels
 * - Error reporting/monitoring integration
 * - Custom error classes for different scenarios
 */

import { Response } from 'express';

/**
 * Handle and Respond to Errors
 * 
 * Centralized error handler that logs errors for debugging while returning
 * a safe, generic error message to the client. This prevents sensitive
 * information from being exposed in error responses.
 * 
 * Security Considerations:
 * - Never expose internal error details to clients
 * - Log full error details for debugging
 * - Use generic error messages for security
 * - Return appropriate HTTP status codes
 * 
 * @param error - Error object or any error data
 * @param res - Express response object
 * @returns Response with standardized error format
 */
export const handleError = (error: any, res: Response) => {
    // Log the full error details for debugging (server-side only)
    console.error('Error:', error);
    
    // Return generic error message to client for security
    return res.status(500).json({ error: 'Internal server error' });
};
