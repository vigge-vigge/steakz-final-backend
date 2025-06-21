import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';
import {
  getSystemStatistics,
  getRestaurantStatus,
  getLiveOrderActivity,
  getFinancialData,
  getSystemHealth,
  getActivityFeed,
  getPerformanceAnalytics,
  getSystemAlerts,
  performQuickAction
} from '../controllers/adminDashboardController';

const router = Router();

// All admin dashboard routes require authentication
router.use(authenticateToken);

// System-Wide Statistics
router.get('/statistics', authorizeRole(['ADMIN', 'CASHIER']), getSystemStatistics);

// Real-Time Restaurant Status Grid
router.get('/restaurant-status', getRestaurantStatus);

// Live Order Activity Monitor
router.get('/live-orders', getLiveOrderActivity);

// Financial Dashboard
router.get('/financial', getFinancialData);

// System Health Monitoring
router.get('/health', getSystemHealth);

// Activity Feed
router.get('/activity', getActivityFeed);

// Performance Analytics
router.get('/analytics', getPerformanceAnalytics);

// Alert System
router.get('/alerts', getSystemAlerts);

// Quick Action Controls
router.post('/actions', performQuickAction);

export default router;
