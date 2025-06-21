"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCurrentUser = exports.getCurrentUser = exports.deleteUser = exports.changeRole = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const errorHandler_1 = require("../utils/errorHandler");
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const hash_1 = require("../utils/hash");
const getAllUsers = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const whereClause = req.user.role === 'ADMIN' ? {} :
            req.user.role === 'GENERAL_MANAGER' ? {} :
                { branchId: req.user.branchId };
        const [users, total] = await Promise.all([
            prisma_1.default.user.findMany({
                where: whereClause,
                skip,
                take: limit,
                select: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                    branchId: true,
                    createdAt: true,
                    branch: {
                        select: {
                            name: true
                        }
                    }
                }
            }),
            prisma_1.default.user.count({ where: whereClause })
        ]);
        res.json({
            users,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                current: page,
                perPage: limit
            }
        });
    }
    catch (error) {
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const parsedId = parseInt(id);
        if (isNaN(parsedId)) {
            res.status(400).json({ message: 'Invalid user ID' });
            return;
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: parsedId },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                branchId: true,
                createdAt: true,
                branch: {
                    select: {
                        name: true
                    }
                }
            }
        });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (req.user.role !== 'ADMIN' &&
            req.user.role !== 'GENERAL_MANAGER' &&
            user.branchId !== req.user.branchId) {
            res.status(403).json({ message: 'Unauthorized to view this user' });
            return;
        }
        res.json(user);
    }
    catch (error) {
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.getUserById = getUserById;
const createUser = async (req, res) => {
    try {
        const { username, email, password, role, branchId } = req.body;
        if (!username || !email || !password || !role) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }
        const hashedPassword = await (0, hash_1.hashPassword)(password);
        const userData = {
            username,
            email,
            password: hashedPassword,
            role,
            createdBy: { connect: { id: req.user.id } },
            ...(branchId && {
                branch: { connect: { id: branchId } }
            })
        };
        const user = await prisma_1.default.user.create({
            data: userData,
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                branchId: true,
                createdAt: true
            }
        });
        res.status(201).json(user);
    }
    catch (error) {
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const parsedId = parseInt(id);
        const { username, email, password, role, branchId } = req.body;
        if (isNaN(parsedId)) {
            res.status(400).json({ message: 'Invalid user ID' });
            return;
        }
        const updateData = {};
        if (username)
            updateData.username = username;
        if (email)
            updateData.email = email;
        if (password)
            updateData.password = await (0, hash_1.hashPassword)(password);
        if (role)
            updateData.role = role;
        if (branchId !== undefined) {
            updateData.branch = branchId ? { connect: { id: branchId } } : { disconnect: true };
        }
        const user = await prisma_1.default.user.update({
            where: { id: parsedId },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                branchId: true,
                createdAt: true
            }
        });
        res.json(user);
    }
    catch (error) {
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.updateUser = updateUser;
const changeRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const parsedId = parseInt(id);
        if (isNaN(parsedId)) {
            res.status(400).json({ message: 'Invalid user ID' });
            return;
        }
        if (!Object.values(client_1.Role).includes(role)) {
            res.status(400).json({ message: 'Invalid role' });
            return;
        }
        const user = await prisma_1.default.user.update({
            where: { id: parsedId },
            data: { role },
            select: {
                id: true,
                username: true,
                role: true
            }
        });
        res.json(user);
    }
    catch (error) {
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.changeRole = changeRole;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const parsedId = parseInt(id);
        if (isNaN(parsedId)) {
            res.status(400).json({ message: 'Invalid user ID' });
            return;
        }
        await prisma_1.default.user.delete({
            where: { id: parsedId }
        });
        res.status(204).send();
    }
    catch (error) {
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.deleteUser = deleteUser;
const getCurrentUser = async (req, res) => {
    try {
        console.log('getCurrentUser req.user:', req.user);
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                branchId: true,
                createdAt: true,
                updatedAt: true,
                branch: {
                    select: { name: true }
                }
            }
        });
        console.log('getCurrentUser prisma.user:', user);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
        console.log('getCurrentUser response sent:', user);
    }
    catch (error) {
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.getCurrentUser = getCurrentUser;
const updateCurrentUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const updateData = {};
        if (username)
            updateData.username = username;
        if (email)
            updateData.email = email;
        if (password)
            updateData.password = await (0, hash_1.hashPassword)(password);
        const user = await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                branchId: true,
                createdAt: true,
                updatedAt: true,
                branch: {
                    select: { name: true }
                }
            }
        });
        res.json(user);
    }
    catch (error) {
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.updateCurrentUser = updateCurrentUser;
//# sourceMappingURL=userController.js.map