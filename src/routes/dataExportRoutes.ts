import { Router } from 'express';
import { startExport, getExportStatus, downloadExportFile } from '../controllers/dataExportController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/start', authenticateToken, (req, res, next) => { startExport(req, res).catch(next); });
router.get('/status/:jobId', authenticateToken, (req, res, next) => { getExportStatus(req, res).catch(next); });
router.get('/download/:jobId', authenticateToken, (req, res, next) => { downloadExportFile(req, res).catch(next); });

export default router;
