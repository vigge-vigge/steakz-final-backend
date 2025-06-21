"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const receiptController_1 = require("../controllers/receiptController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
router.use(authMiddleware_1.authenticateToken);
router.post('/', (0, authMiddleware_1.authorizeRole)(['CUSTOMER', 'CASHIER', 'BRANCH_MANAGER', 'ADMIN']), asyncHandler(receiptController_1.createReceipt));
router.get('/', (0, authMiddleware_1.authorizeRole)(['CASHIER', 'BRANCH_MANAGER', 'ADMIN']), asyncHandler(receiptController_1.getReceipts));
router.get('/stats', (0, authMiddleware_1.authorizeRole)(['BRANCH_MANAGER', 'ADMIN']), asyncHandler(receiptController_1.getReceiptStats));
router.get('/:id', (0, authMiddleware_1.authorizeRole)(['CASHIER', 'BRANCH_MANAGER', 'ADMIN']), asyncHandler(receiptController_1.getReceiptById));
exports.default = router;
//# sourceMappingURL=receipts.js.map