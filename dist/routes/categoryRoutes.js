"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const categoryController_1 = require("../controllers/categoryController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get('/', (req, res, next) => { (0, categoryController_1.getCategories)(req, res).catch(next); });
router.post('/', authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRole)(['ADMIN']), (req, res, next) => { (0, categoryController_1.createCategory)(req, res).catch(next); });
router.put('/:id', authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRole)(['ADMIN']), (req, res, next) => { (0, categoryController_1.updateCategory)(req, res).catch(next); });
router.delete('/:id', authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRole)(['ADMIN']), (req, res, next) => { (0, categoryController_1.deleteCategory)(req, res).catch(next); });
router.post('/reorder', authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRole)(['ADMIN']), (req, res, next) => { (0, categoryController_1.reorderCategories)(req, res).catch(next); });
exports.default = router;
//# sourceMappingURL=categoryRoutes.js.map