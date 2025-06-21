import { Router } from 'express';
import {
    getOrders,
    createOrder,
    updateOrderStatus,
    deleteOrder
} from '../controllers/orderController';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';

const router = Router();

// All order routes require authentication
router.use(authenticateToken);

// Get orders - accessible by all authenticated users
// Different roles get different views based on controller logic
router.get('/', authorizeRole(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER', 'CHEF', 'CASHIER', 'CUSTOMER']), asyncHandler(getOrders));

// Create order - accessible by customers and cashiers
function asyncHandler(fn: any) {
    return function (req: any, res: any, next: any) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

router.post('/',
    authorizeRole(['CUSTOMER', 'CASHIER']),
    asyncHandler(createOrder)
);

// Update order status - accessible by chefs and cashiers
router.patch('/:id/status',
    authorizeRole(['CHEF', 'CASHIER']),
    updateOrderStatus
);

// Delete order - accessible by admin and branch manager
router.delete('/:id',
    authorizeRole(['ADMIN', 'BRANCH_MANAGER']),
    deleteOrder
);

// POST /api/cart - sync local cart to DB for logged-in customer
router.post('/cart', authenticateToken, authorizeRole(['CUSTOMER']), (req, res, next) => {
  (async () => {
    try {
      const userId = req.user?.id;
      const items = req.body.items as Array<{ id: number; quantity: number }>;

      if (!userId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'No items to add to cart' });
      }

      // Create a new order with status PENDING (or update existing PENDING order)
      let order = await prisma.order.findFirst({
        where: { customerId: userId, status: 'PENDING' },
      });

      if (!order) {
        order = await prisma.order.create({
          data: {
            customerId: userId,
            branchId: 1, // TODO: choose branch logic if needed
            status: 'PENDING',
            totalAmount: 0,
          },
        });
      }

      // Remove existing items for this order
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });

      // Add new items
      let totalAmount = 0;
      for (const item of items) {
        const menuItem = await prisma.menuItem.findUnique({ where: { id: item.id } });
        const price = menuItem ? menuItem.price : 0;
        const subtotal = price * item.quantity;
        totalAmount += subtotal;
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            menuItemId: item.id,
            quantity: item.quantity,
            unitPrice: price,
            subtotal,
          },
        });
      }
      // Update order total
      await prisma.order.update({ where: { id: order.id }, data: { totalAmount } });
      res.status(200).json({ success: true });
      return;
    } catch (err) {
      return res.status(500).json({ error: 'Failed to sync cart' });
    }
  })().catch(next);
});

// GET /api/cart - get current cart for logged-in customer
router.get('/cart', authenticateToken, authorizeRole(['CUSTOMER']), (req, res, next) => {
  (async () => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });
      // Find the PENDING order for this customer
      const order = await prisma.order.findFirst({
        where: { customerId: userId, status: 'PENDING' },
        include: {
          items: true,
        },
      });
      if (!order || !order.items.length) return res.json({ items: [] });
      // Return cart items in the same format as the frontend expects
      res.json({
        items: order.items.map(item => ({ id: item.menuItemId, quantity: item.quantity }))
      });
      return;
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch cart' });
      return;
    }
  })().catch(next);
});

export default router;
