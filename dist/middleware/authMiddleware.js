"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeBranchAccess = exports.authorizeRole = exports.authenticateToken = void 0;
exports.authorizeRoles = authorizeRoles;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
dotenv_1.default.config();
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) {
        res.status(401).json({ message: 'No token provided' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        console.log('Decoded JWT:', decoded);
        const { userId, role, branchId } = decoded;
        if (!userId || typeof userId !== 'number' || isNaN(userId) || !isFinite(userId)) {
            res.status(401).json({ message: 'Invalid userId in token' });
            return;
        }
        if (!role || !Object.values(client_1.Role).includes(role)) {
            res.status(401).json({ message: 'Invalid or missing role in token' });
            return;
        }
        req.user = {
            id: userId,
            role,
            ...(branchId && { branchId }),
        };
        console.log('req.user set by middleware:', req.user);
        next();
    }
    catch (err) {
        const error = err;
        res.status(401).json({ message: 'Invalid or expired token', error: error.message });
    }
};
exports.authenticateToken = authenticateToken;
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            res.status(403).json({
                message: `Access denied. Authentication required.`
            });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                message: `Access denied. Required role: ${roles.join(' or ')}`
            });
            return;
        }
        next();
    };
};
exports.authorizeRole = authorizeRole;
function authorizeRoles(roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        next();
    };
}
const authorizeBranchAccess = () => {
    return (req, res, next) => {
        const user = req.user;
        const requestedBranchId = Number(req.params['branchId'] || req.body['branchId']);
        if (!requestedBranchId) {
            res.status(400).json({ message: 'Branch ID is required' });
            return;
        }
        if (user.role === 'ADMIN' || user.role === 'GENERAL_MANAGER') {
            next();
            return;
        }
        if (!user.branchId || user.branchId !== requestedBranchId) {
            res.status(403).json({
                message: 'Access denied. You can only access your assigned branch.'
            });
            return;
        }
        next();
    };
};
exports.authorizeBranchAccess = authorizeBranchAccess;
//# sourceMappingURL=authMiddleware.js.map