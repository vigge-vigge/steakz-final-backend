import express from 'express';
import { createReceipt, getReceipts, getReceiptById, getReceiptStats } from '../controllers/receiptController';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';

const router = express.Router();

// Async handler wrapper
function asyncHandler(fn: any) {
    return function (req: any, res: any, next: any) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// All receipt routes require authentication
router.use(authenticateToken);

// Create receipt for an order - accessible by customers, cashiers and management
router.post('/', authorizeRole(['CUSTOMER', 'CASHIER', 'BRANCH_MANAGER', 'ADMIN']), asyncHandler(createReceipt));

// Get all receipts (with filtering) - accessible by cashiers and management
router.get('/', authorizeRole(['CASHIER', 'BRANCH_MANAGER', 'ADMIN']), asyncHandler(getReceipts));

// Get receipt statistics - accessible by management
router.get('/stats', authorizeRole(['BRANCH_MANAGER', 'ADMIN']), asyncHandler(getReceiptStats));

// Get receipt by ID - accessible by cashiers and management
router.get('/:id', authorizeRole(['CASHIER', 'BRANCH_MANAGER', 'ADMIN']), asyncHandler(getReceiptById));

export default router;
