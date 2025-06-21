"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.get('/me', userController_1.getCurrentUser);
router.put('/me', userController_1.updateCurrentUser);
router.get('/', userController_1.getAllUsers);
router.get('/:id', userController_1.getUserById);
router.post('/', (0, authMiddleware_1.authorizeRole)([client_1.Role.ADMIN]), userController_1.createUser);
router.put('/:id', (0, authMiddleware_1.authorizeRole)([client_1.Role.ADMIN]), userController_1.updateUser);
router.patch('/:id/role', (0, authMiddleware_1.authorizeRole)([client_1.Role.ADMIN]), userController_1.changeRole);
router.delete('/:id', (0, authMiddleware_1.authorizeRole)([client_1.Role.ADMIN]), userController_1.deleteUser);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map