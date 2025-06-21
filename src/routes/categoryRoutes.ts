import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
} from '../controllers/categoryController';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', (req, res, next) => { getCategories(req, res).catch(next); });
router.post('/', authenticateToken, authorizeRole(['ADMIN']), (req, res, next) => { createCategory(req, res).catch(next); });
router.put('/:id', authenticateToken, authorizeRole(['ADMIN']), (req, res, next) => { updateCategory(req, res).catch(next); });
router.delete('/:id', authenticateToken, authorizeRole(['ADMIN']), (req, res, next) => { deleteCategory(req, res).catch(next); });
router.post('/reorder', authenticateToken, authorizeRole(['ADMIN']), (req, res, next) => { reorderCategories(req, res).catch(next); });

export default router;
