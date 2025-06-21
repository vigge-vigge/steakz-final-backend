/**
 * Branch Dashboard Routes
 * 
 * This module defines all API endpoints for branch management functionality.
 * It provides comprehensive branch analytics, reporting, and management
 * capabilities for branch managers and staff.
 * 
 * Route Categories:
 * - Public routes: Customer feedback and stats (no authentication required)
 * - Dashboard routes: Real-time branch overview data
 * - Analytics routes: Individual data endpoints for specific metrics
 * - Reports routes: Comprehensive business reports and exports
 * - Feedback routes: Customer feedback management
 * 
 * Security:
 * - Most routes require BRANCH_MANAGER role
 * - Feedback endpoints are public for customer access
 * - Branch-specific data filtering applied in controllers
 * 
 * Base URL: /api/branch-dashboard
 */

import { Router, RequestHandler } from 'express';
import { 
  getBranchDashboard,        // Main dashboard overview data
  getDailySales,             // Today's sales figures
  getActiveOrders,           // Current active orders
  getStaffOnShift,           // Staff currently working
  getInventoryAlerts,        // Low stock alerts
  getCustomerFeedback,       // Customer feedback and reviews
  getFeedbackStats,          // Feedback summary statistics
  getWeeklyTrend,           // 7-day sales trend
  getBranchMetricsSimple,   // Key performance metrics
  getSalesReport,           // Detailed sales analysis
  getStaffPerformance,      // Staff productivity metrics
  getOrderAnalytics,        // Order pattern analysis
  exportBranchReport,       // CSV/Excel export functionality
  getInventoryReport        // Inventory status report
} from '../controllers/branchDashboardController';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';
import { Role } from '@prisma/client';
import { assignFeedback, updateFeedbackStatus } from '../controllers/feedbackController';

const router = Router();

// ========================================
// PUBLIC ENDPOINTS (No Authentication Required)
// ========================================
// These endpoints are public to allow customer feedback submission and display

// GET /api/branch-dashboard/feedback/stats - Get feedback statistics summary
router.get('/feedback/stats', getFeedbackStats as RequestHandler);

// GET /api/branch-dashboard/customer-feedback - Get customer feedback and reviews
router.get('/customer-feedback', getCustomerFeedback as RequestHandler);

// PUT /api/branch-dashboard/feedback/:feedbackId/assign - Assign feedback to staff member
router.put('/feedback/:feedbackId/assign', assignFeedback);

// PUT /api/branch-dashboard/feedback/:feedbackId/status - Update feedback resolution status
router.put('/feedback/:feedbackId/status', updateFeedbackStatus);

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================
// All routes below this point require valid JWT authentication
router.use(authenticateToken as RequestHandler);

// ========================================
// MAIN DASHBOARD ROUTE
// ========================================
// GET /api/branch-dashboard/dashboard - Comprehensive branch overview
router.get('/dashboard', authorizeRole([Role.BRANCH_MANAGER]) as RequestHandler, getBranchDashboard as RequestHandler);

// ========================================
// INDIVIDUAL ANALYTICS ENDPOINTS
// ========================================
// These endpoints provide specific pieces of dashboard data for real-time updates

// GET /api/branch-dashboard/daily-sales - Today's sales summary
router.get('/daily-sales', authorizeRole([Role.BRANCH_MANAGER]) as RequestHandler, getDailySales as RequestHandler);

// GET /api/branch-dashboard/active-orders - Current orders in progress
router.get('/active-orders', authorizeRole([Role.BRANCH_MANAGER]) as RequestHandler, getActiveOrders as RequestHandler);

// GET /api/branch-dashboard/staff-on-shift - Staff currently working
router.get('/staff-on-shift', authorizeRole([Role.BRANCH_MANAGER]) as RequestHandler, getStaffOnShift as RequestHandler);

// GET /api/branch-dashboard/inventory-alerts - Low stock warnings
router.get('/inventory-alerts', authorizeRole([Role.BRANCH_MANAGER]) as RequestHandler, getInventoryAlerts as RequestHandler);

// GET /api/branch-dashboard/weekly-trend - 7-day performance trend
router.get('/weekly-trend', authorizeRole([Role.BRANCH_MANAGER]) as RequestHandler, getWeeklyTrend as RequestHandler);

// GET /api/branch-dashboard/metrics - Key performance indicators
router.get('/metrics', authorizeRole([Role.BRANCH_MANAGER]) as RequestHandler, getBranchMetricsSimple as RequestHandler);

// ========================================
// BUSINESS REPORTS ENDPOINTS
// ========================================
// Comprehensive reporting functionality for business analysis

// GET /api/branch-dashboard/reports/sales - Detailed sales report with analytics
router.get('/reports/sales', authorizeRole([Role.BRANCH_MANAGER]) as RequestHandler, getSalesReport as RequestHandler);

// GET /api/branch-dashboard/reports/inventory - Inventory status and movement report
router.get('/reports/inventory', authorizeRole([Role.BRANCH_MANAGER]) as RequestHandler, getInventoryReport as RequestHandler);

// GET /api/branch-dashboard/reports/staff-performance - Staff productivity and performance metrics
router.get('/reports/staff-performance', authorizeRole([Role.BRANCH_MANAGER]) as RequestHandler, getStaffPerformance as RequestHandler);

// GET /api/branch-dashboard/reports/order-analytics - Order patterns and customer behavior analysis
router.get('/reports/order-analytics', authorizeRole([Role.BRANCH_MANAGER]) as RequestHandler, getOrderAnalytics as RequestHandler);

// GET /api/branch-dashboard/reports/export - Export comprehensive branch report (CSV/Excel)
router.get('/reports/export', authorizeRole([Role.BRANCH_MANAGER]) as RequestHandler, exportBranchReport as RequestHandler);

export default router;
