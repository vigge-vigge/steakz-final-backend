"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const commentController_1 = require("../controllers/commentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get('/', commentController_1.getAllComments);
router.post('/', (req, _res, next) => {
    if (!req.headers.authorization) {
        req.user = undefined;
    }
    next();
}, commentController_1.createComment);
router.delete('/:id', authMiddleware_1.authenticateToken, commentController_1.deleteComment);
exports.default = router;
//# sourceMappingURL=commentRoutes.js.map