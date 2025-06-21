import { Router } from 'express';
import { processPayment, getPayment, reprintReceipt, emailReceipt } from '../controllers/paymentController';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// All payment routes require authentication
router.use(authenticateToken);

// Process payment for an order
router.post('/:orderId', 
  authorizeRole(['CUSTOMER', 'CASHIER']),
  (req, res, next) => {
    processPayment(req, res).catch(next);
  }
);

// Get payment details for an order
router.get('/:orderId',
  authorizeRole(['CUSTOMER', 'CASHIER', 'ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']),
  (req, res, next) => {
    getPayment(req, res).catch(next);
  }
);

// Reprint receipt
router.post('/:paymentId/reprint',
  authorizeRole(['CASHIER', 'ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']),
  (req, res, next) => {
    reprintReceipt(req, res).catch(next);
  }
);

// Email receipt
router.post('/:paymentId/email',
  authorizeRole(['CASHIER', 'ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']),
  (req, res, next) => {
    emailReceipt(req, res).catch(next);
  }
);

export default router;
