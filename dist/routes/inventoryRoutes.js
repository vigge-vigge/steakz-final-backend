"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventoryController_1 = require("../controllers/inventoryController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.get('/', (req, res, next) => {
    (0, inventoryController_1.getInventory)(req, res).catch(next);
});
router.put('/:id', (req, res, next) => {
    (0, inventoryController_1.updateInventoryItem)(req, res).catch(next);
});
router.post('/', (0, authMiddleware_1.authorizeRole)(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']), (req, res, next) => {
    (0, inventoryController_1.createInventoryItem)(req, res).catch(next);
});
router.delete('/:id', (0, authMiddleware_1.authorizeRole)(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']), (req, res, next) => {
    (0, inventoryController_1.deleteInventoryItem)(req, res).catch(next);
});
exports.default = router;
//# sourceMappingURL=inventoryRoutes.js.map