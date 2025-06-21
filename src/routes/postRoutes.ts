import express from 'express';
import {
  getPosts,
  getPost,
  getMyPosts,
  createPost,
  deletePost
} from '../controllers/postController';
import { authenticateToken } from '../middleware/authMiddleware';
const router = express.Router();

// Public routes
router.get('/', getPosts); // All posts
// Protected route for user's own posts (must be before /:id)
router.get('/my', authenticateToken, getMyPosts);
router.get('/:id', getPost); // Single post by ID
// Protected route for creating a post
router.post('/', authenticateToken, createPost);
// Protected route for deleting a post
router.delete('/:id', authenticateToken, deletePost);

export default router;