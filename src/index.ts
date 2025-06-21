// Main entry point for the Restaurant Management API backend server
// This file sets up Express server with all routes, middleware, and database seeding

import express, { Request, Response } from 'express';
// Import all route modules - each handles different API endpoints
import userRoutes from './routes/userRoutes';           // User account management
import authRoutes from './routes/authRoutes';           // Login, registration, password reset
import staffRoutes from './routes/staffRoutes';         // Staff management for managers
import branchRoutes from './routes/branchRoutes';       // Branch operations and data
import branchDashboardRoutes from './routes/branchDashboardRoutes'; // Branch manager dashboard APIs
import menuRoutes from './routes/menuRoutes';           // Menu item management
import orderRoutes from './routes/orderRoutes';         // Order processing and tracking
import paymentRoutes from './routes/paymentRoutes';     // Payment processing
import dataExportRoutes from './routes/dataExportRoutes'; // Data export functionality
import inventoryRoutes from './routes/inventoryRoutes'; // Inventory management
import adminDashboardRoutes from './routes/adminDashboardRoutes'; // Admin dashboard APIs
import categoryRoutes from './routes/categoryRoutes';   // Menu categories
import receiptRoutes from './routes/receipts';          // Receipt management
import postRoutes from './routes/postRoutes';           // Customer reviews/posts
import commentRoutes from './routes/commentRoutes';     // Comments on posts
import dotenv from 'dotenv';                            // Environment variable management
import cors from 'cors';                                // Cross-Origin Resource Sharing
import { seedAdminUser } from './utils/seedAdmin';      // Create default admin user

// Load environment variables from .env file (database URL, JWT secret, etc.)
dotenv.config();

// Create Express application instance
const app = express();
const port = 3001; // Server will run on localhost:3001

// === MIDDLEWARE SETUP ===
// CORS: Allow frontend (React) to communicate with backend from different port
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://steakz-final-frontend.onrender.com'
}));

// JSON Parser: Parse incoming JSON request bodies
app.use(express.json());

// === BASIC ROUTE ===
// Homepage route - simple welcome message when accessing server root
app.get('/', (_req: Request, res: Response) => {
    res.send('Welcome to the Restaurant Management API!');
});

// === API ROUTES SETUP ===
// Each route handler manages specific functionality:
app.use('/api/users', userRoutes);              // User CRUD operations
app.use('/auth', authRoutes);                   // Authentication endpoints
app.use('/api/staff', staffRoutes);             // Staff management
app.use('/api/branches', branchRoutes);         // Branch operations
app.use('/api/branch-dashboard', branchDashboardRoutes); // Branch dashboard data
app.use('/api/menu', menuRoutes);               // Menu management
app.use('/api/menu-items', menuRoutes);         // Alias for frontend compatibility
app.use('/api/inventory', inventoryRoutes);     // Inventory tracking
app.use('/api/orders', orderRoutes);            // Order processing
app.use('/api/payments', paymentRoutes);        // Payment handling
app.use('/api/data-export', dataExportRoutes);  // Export reports/data
app.use('/api/admin-dashboard', adminDashboardRoutes); // Admin dashboard
app.use('/api/categories', categoryRoutes);     // Menu categories
app.use('/api/receipts', receiptRoutes);        // Receipt management
app.use('/api/posts', postRoutes);              // Customer reviews/feedback
app.use('/api/comments', commentRoutes);        // Comments on reviews

// === SERVER STARTUP ===
// Start the server and seed initial admin user
app.listen(port, async () => {
    console.log(`🚀 Restaurant Management API Server running on http://localhost:${port}`);
    console.log('📋 Available endpoints:');
    console.log('   - Authentication: /auth/*');
    console.log('   - Users: /api/users/*');
    console.log('   - Staff Management: /api/staff/*');
    console.log('   - Branch Operations: /api/branches/*');
    console.log('   - Branch Dashboard: /api/branch-dashboard/*');
    console.log('   - Menu Management: /api/menu/*');
    console.log('   - Orders: /api/orders/*');
    console.log('   - Payments: /api/payments/*');
    console.log('   - Inventory: /api/inventory/*');
    console.log('   - Admin Dashboard: /api/admin-dashboard/*');
    console.log('   - Reviews/Posts: /api/posts/*');
    console.log('   - Data Export: /api/data-export/*');
    
    // Create default admin user if it doesn't exist
    // This ensures there's always an admin account to access the system
    try {
        await seedAdminUser();
        console.log('✅ Admin user seeding completed');
    } catch (error) {
        console.error('❌ Error seeding admin user:', error);
    }
});