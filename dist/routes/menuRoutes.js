"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const menuController_1 = require("../controllers/menuController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get('/', (req, res, next) => {
    (0, menuController_1.getMenuItems)(req, res).catch(next);
});
router.post('/', authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRole)(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']), menuController_1.createMenuItem);
router.put('/:id', authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRole)(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']), menuController_1.updateMenuItem);
router.delete('/:id', authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRole)(['ADMIN', 'GENERAL_MANAGER']), menuController_1.deleteMenuItem);
exports.default = router;
//# sourceMappingURL=menuRoutes.js.map