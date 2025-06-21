"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const staffController_1 = require("../controllers/staffController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.get('/', (0, authMiddleware_1.authorizeRole)(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']), staffController_1.getStaffMembers);
router.post('/', (0, authMiddleware_1.authorizeRole)(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']), staffController_1.createStaffMember);
router.put('/:id', (0, authMiddleware_1.authorizeRole)(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']), staffController_1.updateStaffMember);
router.delete('/:id', (0, authMiddleware_1.authorizeRole)(['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER']), staffController_1.deleteStaffMember);
exports.default = router;
//# sourceMappingURL=staffRoutes.js.map