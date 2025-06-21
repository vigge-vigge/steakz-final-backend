/**
 * Token Management Utilities
 * 
 * This module provides utilities for generating and validating various types
 * of tokens used in the authentication system, particularly for password
 * reset functionality.
 * 
 * Features:
 * - Cryptographically secure random token generation
 * - Token expiration validation
 * - Uses Node.js crypto module for security
 */

import crypto from 'crypto';

/**
 * Generate Secure Reset Token
 * 
 * Creates a cryptographically secure random token for password reset operations.
 * Uses Node.js crypto.randomBytes for true randomness, making tokens impossible
 * to predict or guess.
 * 
 * Token Properties:
 * - 32 bytes of random data (256 bits of entropy)
 * - Hexadecimal encoding for URL-safe usage
 * - Suitable for one-time use scenarios
 * 
 * @returns string - 64-character hexadecimal token
 */
export const generateResetToken = (): string => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Check Token Expiration
 * 
 * Validates whether a token has expired by comparing its expiry date
 * against the current time. Handles null/undefined expiry dates as expired.
 * 
 * @param expiryDate - Token expiration date or null
 * @returns boolean - True if token is expired or has no expiry date, false if still valid
 */
export const isTokenExpired = (expiryDate: Date | null): boolean => {
    if (!expiryDate) return true; // Treat null/undefined as expired
    return expiryDate.getTime() < Date.now(); // Compare timestamps
};
