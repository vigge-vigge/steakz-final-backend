import { Router } from 'express';
import {
  createStaffMember,
  getStaffMembers,
  updateStaffMember,
  deleteStaffMember
} from '../controllers/staffController';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// All staff routes require authentication
router.use(authenticateToken);

// Staff list - accessible by ADMIN, GENERAL_MANAGER, and BRANCH_MANAGER
router.get(
  '/',
  authorizeRole(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']),
  getStaffMembers
);

// Create staff - accessible by ADMIN, GENERAL_MANAGER, and BRANCH_MANAGER
router.post(
  '/',
  authorizeRole(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']),
  createStaffMember
);

// Update staff - accessible by ADMIN, GENERAL_MANAGER, and BRANCH_MANAGER
router.put(
  '/:id',
  authorizeRole(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']),
  updateStaffMember
);

// Delete staff - accessible by ADMIN, GENERAL_MANAGER, and BRANCH_MANAGER
router.delete(
  '/:id',
  authorizeRole(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']),
  deleteStaffMember
);

export default router;
