"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStaffMember = exports.updateStaffMember = exports.getStaffMembers = exports.createStaffMember = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const hash_1 = require("../utils/hash");
const createStaffMember = async (req, res) => {
    try {
        const { username, email, password, role, branchId } = req.body;
        const adminUser = req.user;
        if (!username?.trim() || !password?.trim() || !email?.trim() || !role) {
            res.status(400).json({ message: 'All fields are required' });
            return;
        }
        const validRoles = ['CHEF', 'CASHIER', 'BRANCH_MANAGER'];
        if (adminUser.role === 'GENERAL_MANAGER' && !validRoles.includes(role)) {
            res.status(403).json({ message: 'Invalid role specified for staff member' });
            return;
        }
        if (adminUser.role === 'BRANCH_MANAGER' && !['CHEF', 'CASHIER'].includes(role)) {
            res.status(403).json({ message: 'Branch managers can only create Chef and Cashier roles' });
            return;
        }
        if (adminUser.role === 'BRANCH_MANAGER') {
            if (!branchId || adminUser.branchId !== branchId) {
                res.status(403).json({ message: 'You can only create staff for your branch' });
                return;
            }
        }
        const existingUser = await prisma_1.default.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });
        if (existingUser) {
            res.status(400).json({
                message: existingUser.username === username
                    ? 'Username already exists'
                    : 'Email already registered'
            });
            return;
        }
        const hashedPassword = await (0, hash_1.hashPassword)(password);
        const newStaff = await prisma_1.default.user.create({
            data: {
                username: username.trim(),
                email: email.trim(),
                password: hashedPassword,
                role,
                branchId,
                createdById: adminUser.id
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                branchId: true,
                createdAt: true,
                createdBy: {
                    select: {
                        username: true
                    }
                }
            }
        });
        res.status(201).json({
            message: 'Staff member created successfully',
            staff: newStaff
        });
    }
    catch (error) {
        console.error('Error in createStaffMember:', error);
        res.status(500).json({ message: 'Error creating staff member' });
    }
};
exports.createStaffMember = createStaffMember;
const getStaffMembers = async (req, res) => {
    try {
        const user = req.user;
        const { branchId } = req.query;
        let where = {};
        if (user.role === 'BRANCH_MANAGER') {
            where.branchId = user.branchId;
            where.role = { not: 'CUSTOMER' };
        }
        else if (user.role === 'GENERAL_MANAGER') {
            if (branchId) {
                where.branchId = Number(branchId);
            }
            where.role = { not: 'CUSTOMER' };
        }
        else if (user.role === 'ADMIN') {
            if (branchId) {
                where.branchId = Number(branchId);
            }
            where.role = { not: 'CUSTOMER' };
        }
        else {
            where.branchId = user.branchId;
            where.role = { not: 'CUSTOMER' };
        }
        const staff = await prisma_1.default.user.findMany({
            where,
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
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({ staff });
    }
    catch (error) {
        console.error('Error in getStaffMembers:', error);
        res.status(500).json({ message: 'Error fetching staff members' });
    }
};
exports.getStaffMembers = getStaffMembers;
const updateStaffMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password, role, branchId } = req.body;
        const adminUser = req.user;
        const targetUser = await prisma_1.default.user.findUnique({
            where: { id: Number(id) },
            include: {
                branch: true
            }
        });
        if (!targetUser) {
            res.status(404).json({ message: 'Staff member not found' });
            return;
        }
        if (adminUser.role === 'BRANCH_MANAGER') {
            if (!targetUser.branchId || targetUser.branchId !== adminUser.branchId) {
                res.status(403).json({ message: 'You can only update staff in your branch' });
                return;
            }
            if (role && role !== targetUser.role) {
                res.status(403).json({ message: 'Branch managers cannot change staff roles' });
                return;
            }
            if (branchId && branchId !== adminUser.branchId) {
                res.status(403).json({ message: 'You cannot move staff to different branches' });
                return;
            }
        }
        const updateData = {};
        if (username?.trim()) {
            const existingUser = await prisma_1.default.user.findUnique({
                where: { username: username.trim() }
            });
            if (existingUser && existingUser.id !== Number(id)) {
                res.status(400).json({ message: 'Username already exists' });
                return;
            }
            updateData.username = username.trim();
        }
        if (email?.trim()) {
            const existingUser = await prisma_1.default.user.findUnique({
                where: { email: email.trim() }
            });
            if (existingUser && existingUser.id !== Number(id)) {
                res.status(400).json({ message: 'Email already registered' });
                return;
            }
            updateData.email = email.trim();
        }
        if (password?.trim()) {
            updateData.password = await (0, hash_1.hashPassword)(password);
        }
        if (role && adminUser.role !== 'BRANCH_MANAGER') {
            updateData.role = role;
        }
        if (branchId && adminUser.role !== 'BRANCH_MANAGER') {
            updateData.branchId = branchId;
        }
        const updatedUser = await prisma_1.default.user.update({
            where: { id: Number(id) },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                branchId: true,
                updatedAt: true,
                branch: {
                    select: {
                        name: true
                    }
                }
            }
        });
        res.json({
            message: 'Staff member updated successfully',
            staff: updatedUser
        });
    }
    catch (error) {
        console.error('Error in updateStaffMember:', error);
        res.status(500).json({ message: 'Error updating staff member' });
    }
};
exports.updateStaffMember = updateStaffMember;
const deleteStaffMember = async (req, res) => {
    try {
        const { id } = req.params;
        const adminUser = req.user;
        const targetUser = await prisma_1.default.user.findUnique({
            where: { id: Number(id) }
        });
        if (!targetUser) {
            res.status(404).json({ message: 'Staff member not found' });
            return;
        }
        if (adminUser.role === 'BRANCH_MANAGER') {
            if (targetUser.branchId !== adminUser.branchId) {
                res.status(403).json({ message: 'You can only delete staff from your branch' });
                return;
            }
        }
        if ((adminUser.role === 'BRANCH_MANAGER' && ['BRANCH_MANAGER', 'GENERAL_MANAGER', 'ADMIN'].includes(targetUser.role)) ||
            (adminUser.role === 'GENERAL_MANAGER' && ['GENERAL_MANAGER', 'ADMIN'].includes(targetUser.role))) {
            res.status(403).json({ message: 'Cannot delete user with higher privileges' });
            return;
        }
        await prisma_1.default.user.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Staff member deleted successfully' });
    }
    catch (error) {
        console.error('Error in deleteStaffMember:', error);
        res.status(500).json({ message: 'Error deleting staff member' });
    }
};
exports.deleteStaffMember = deleteStaffMember;
//# sourceMappingURL=staffController.js.map