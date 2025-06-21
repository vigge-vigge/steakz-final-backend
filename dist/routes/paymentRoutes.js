"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.post('/:orderId', (0, authMiddleware_1.authorizeRole)(['CUSTOMER', 'CASHIER']), (req, res, next) => {
    (0, paymentController_1.processPayment)(req, res).catch(next);
});
router.get('/:orderId', (0, authMiddleware_1.authorizeRole)(['CUSTOMER', 'CASHIER', 'ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']), (req, res, next) => {
    (0, paymentController_1.getPayment)(req, res).catch(next);
});
router.post('/:paymentId/reprint', (0, authMiddleware_1.authorizeRole)(['CASHIER', 'ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']), (req, res, next) => {
    (0, paymentController_1.reprintReceipt)(req, res).catch(next);
});
router.post('/:paymentId/email', (0, authMiddleware_1.authorizeRole)(['CASHIER', 'ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']), (req, res, next) => {
    (0, paymentController_1.emailReceipt)(req, res).catch(next);
});
exports.default = router;
//# sourceMappingURL=paymentRoutes.js.map