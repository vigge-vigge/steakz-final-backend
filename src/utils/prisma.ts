/**
 * Prisma Database Client Configuration
 * 
 * This module creates and exports a singleton instance of the Prisma Client
 * for database operations throughout the application. Using a singleton pattern
 * ensures efficient connection pooling and prevents multiple client instances.
 * 
 * Features:
 * - Singleton pattern for efficient resource usage
 * - Automatic connection pooling
 * - Type-safe database operations
 * - Automatic query optimization
 * - Built-in connection management
 * 
 * Prisma Client Benefits:
 * - Type-safe queries generated from schema
 * - Automatic migrations support
 * - Query optimization and caching
 * - Connection pooling and management
 * - Cross-database compatibility
 * 
 * Usage:
 * Import this module in controllers and services that need database access.
 * The client provides methods for all database operations (CRUD) with
 * full TypeScript support and runtime safety.
 */

import { PrismaClient } from '@prisma/client'

// Create singleton Prisma Client instance
// This will be reused across all database operations in the application
const prisma = new PrismaClient()

export default prisma
