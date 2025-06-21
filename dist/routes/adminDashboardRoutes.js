"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminDashboardController_1 = require("../controllers/adminDashboardController");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.get('/statistics', (0, authMiddleware_1.authorizeRole)(['ADMIN', 'CASHIER']), adminDashboardController_1.getSystemStatistics);
router.get('/restaurant-status', adminDashboardController_1.getRestaurantStatus);
router.get('/live-orders', adminDashboardController_1.getLiveOrderActivity);
router.get('/financial', adminDashboardController_1.getFinancialData);
router.get('/health', adminDashboardController_1.getSystemHealth);
router.get('/activity', adminDashboardController_1.getActivityFeed);
router.get('/analytics', adminDashboardController_1.getPerformanceAnalytics);
router.get('/alerts', adminDashboardController_1.getSystemAlerts);
router.post('/actions', adminDashboardController_1.performQuickAction);
exports.default = router;
//# sourceMappingURL=adminDashboardRoutes.js.map