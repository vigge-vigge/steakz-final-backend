"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderController_1 = require("../controllers/orderController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = __importDefault(require("../utils/prisma"));
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.get('/', (0, authMiddleware_1.authorizeRole)(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER', 'CHEF', 'CASHIER', 'CUSTOMER']), asyncHandler(orderController_1.getOrders));
function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
router.post('/', (0, authMiddleware_1.authorizeRole)(['CUSTOMER', 'CASHIER']), asyncHandler(orderController_1.createOrder));
router.patch('/:id/status', (0, authMiddleware_1.authorizeRole)(['CHEF', 'CASHIER']), orderController_1.updateOrderStatus);
router.delete('/:id', (0, authMiddleware_1.authorizeRole)(['ADMIN', 'BRANCH_MANAGER']), orderController_1.deleteOrder);
router.post('/cart', authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRole)(['CUSTOMER']), (req, res, next) => {
    (async () => {
        try {
            const userId = req.user?.id;
            const items = req.body.items;
            if (!userId || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ error: 'No items to add to cart' });
            }
            let order = await prisma_1.default.order.findFirst({
                where: { customerId: userId, status: 'PENDING' },
            });
            if (!order) {
                order = await prisma_1.default.order.create({
                    data: {
                        customerId: userId,
                        branchId: 1,
                        status: 'PENDING',
                        totalAmount: 0,
                    },
                });
            }
            await prisma_1.default.orderItem.deleteMany({ where: { orderId: order.id } });
            let totalAmount = 0;
            for (const item of items) {
                const menuItem = await prisma_1.default.menuItem.findUnique({ where: { id: item.id } });
                const price = menuItem ? menuItem.price : 0;
                const subtotal = price * item.quantity;
                totalAmount += subtotal;
                await prisma_1.default.orderItem.create({
                    data: {
                        orderId: order.id,
                        menuItemId: item.id,
                        quantity: item.quantity,
                        unitPrice: price,
                        subtotal,
                    },
                });
            }
            await prisma_1.default.order.update({ where: { id: order.id }, data: { totalAmount } });
            res.status(200).json({ success: true });
            return;
        }
        catch (err) {
            return res.status(500).json({ error: 'Failed to sync cart' });
        }
    })().catch(next);
});
router.get('/cart', authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRole)(['CUSTOMER']), (req, res, next) => {
    (async () => {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ error: 'Not authenticated' });
            const order = await prisma_1.default.order.findFirst({
                where: { customerId: userId, status: 'PENDING' },
                include: {
                    items: true,
                },
            });
            if (!order || !order.items.length)
                return res.json({ items: [] });
            res.json({
                items: order.items.map(item => ({ id: item.menuItemId, quantity: item.quantity }))
            });
            return;
        }
        catch (err) {
            res.status(500).json({ error: 'Failed to fetch cart' });
            return;
        }
    })().catch(next);
});
exports.default = router;
//# sourceMappingURL=orderRoutes.js.map