"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dataExportController_1 = require("../controllers/dataExportController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post('/start', authMiddleware_1.authenticateToken, (req, res, next) => { (0, dataExportController_1.startExport)(req, res).catch(next); });
router.get('/status/:jobId', authMiddleware_1.authenticateToken, (req, res, next) => { (0, dataExportController_1.getExportStatus)(req, res).catch(next); });
router.get('/download/:jobId', authMiddleware_1.authenticateToken, (req, res, next) => { (0, dataExportController_1.downloadExportFile)(req, res).catch(next); });
exports.default = router;
//# sourceMappingURL=dataExportRoutes.js.map