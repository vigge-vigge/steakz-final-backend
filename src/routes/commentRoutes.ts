import { Router, Request, Response, NextFunction } from 'express';
import { createComment, getAllComments, deleteComment } from '../controllers/commentController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Public routes
import { RequestHandler } from 'express';

router.get('/', getAllComments as RequestHandler);

// Handle both authenticated and anonymous comments
router.post('/', (req: Request, _res: Response, next: NextFunction) => {
    // Add empty user object for unauthenticated requests
    if (!req.headers.authorization) {
        req.user = undefined;
    }
    next();
}, createComment as RequestHandler);

// Protected routes
router.delete('/:id', authenticateToken, deleteComment as unknown as RequestHandler);

export default router;
