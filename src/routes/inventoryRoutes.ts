import { Router } from 'express';
import {
  getInventory,
  updateInventoryItem,
  createInventoryItem,
  deleteInventoryItem
} from '../controllers/inventoryController';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// All inventory routes require authentication
router.use(authenticateToken);

// Get inventory for a branch - accessible by all authenticated users
router.get('/', (req, res, next) => {
  getInventory(req, res).catch(next);
});

// Update inventory item - accessible by all roles (quantity updates)
// Authorization is handled in the controller based on user role and branch
router.put('/:id', (req, res, next) => {
  updateInventoryItem(req, res).catch(next);
});

// Create inventory item - accessible by branch managers and above
router.post('/',
  authorizeRole(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']),
  (req, res, next) => {
    createInventoryItem(req, res).catch(next);
  }
);

// Delete inventory item - accessible by branch managers and above
router.delete('/:id',
  authorizeRole(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']),
  (req, res, next) => {
    deleteInventoryItem(req, res).catch(next);
  }
);

export default router;
