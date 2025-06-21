import { Router } from 'express';
import {
    getMenuItems,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem
} from '../controllers/menuController';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// Menu items list - public access
router.get('/', (req, res, next) => {
  getMenuItems(req, res).catch(next);
});

// Create menu item - accessible by ADMIN, GENERAL_MANAGER, and BRANCH_MANAGER
router.post('/',
    authenticateToken,
    authorizeRole(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']),
    createMenuItem
);

// Update menu item - accessible by ADMIN, GENERAL_MANAGER, and BRANCH_MANAGER
router.put('/:id',
    authenticateToken,
    authorizeRole(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']),
    updateMenuItem
);

// Delete menu item - accessible by ADMIN and GENERAL_MANAGER
router.delete('/:id',
    authenticateToken,
    authorizeRole(['ADMIN', 'GENERAL_MANAGER']),
    deleteMenuItem
);

export default router;
