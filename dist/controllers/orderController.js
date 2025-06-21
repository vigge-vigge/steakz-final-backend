"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrder = exports.updateOrderStatus = exports.createOrder = exports.getOrders = void 0;
const errorHandler_1 = require("../utils/errorHandler");
const prisma_1 = __importDefault(require("../utils/prisma"));
const getOrders = async (req, res) => {
    try {
        const { branchId, status, customerId } = req.query;
        const user = req.user;
        const whereClause = {};
        if (user?.role === 'CHEF' || user?.role === 'CASHIER') {
            if (user.branchId) {
                whereClause.branchId = user.branchId;
            }
        }
        else if (user?.role === 'CUSTOMER') {
            whereClause.customerId = user.id;
        }
        else if (user?.role === 'BRANCH_MANAGER') {
            if (user.branchId) {
                whereClause.branchId = user.branchId;
            }
        }
        if (branchId && (user?.role === 'ADMIN' || user?.role === 'GENERAL_MANAGER')) {
            whereClause.branchId = Number(branchId);
        }
        if (status)
            whereClause.status = status;
        if (customerId && (user?.role === 'ADMIN' || user?.role === 'GENERAL_MANAGER' || user?.role === 'BRANCH_MANAGER')) {
            whereClause.customerId = Number(customerId);
        }
        const orders = await prisma_1.default.order.findMany({
            where: whereClause,
            include: {
                customer: {
                    select: {
                        username: true,
                        email: true
                    }
                },
                items: {
                    include: {
                        menuItem: true
                    }
                },
                payment: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return res.json(orders);
    }
    catch (error) {
        return (0, errorHandler_1.handleError)(error, res);
    }
};
exports.getOrders = getOrders;
const createOrder = async (req, res) => {
    try {
        let { branchId, items, deliveryAddress, customerId } = req.body;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        let actualCustomerId = customerId;
        if (userRole === 'CUSTOMER') {
            actualCustomerId = userId;
        }
        else if (userRole === 'CASHIER') {
            actualCustomerId = customerId || userId;
        }
        else if (userRole === 'BRANCH_MANAGER' || userRole === 'ADMIN' || userRole === 'GENERAL_MANAGER') {
            actualCustomerId = customerId || userId;
        }
        else {
            return res.status(403).json({ message: 'Insufficient permissions to create orders' });
        }
        if (!items?.length) {
            return res.status(400).json({ message: 'Order must contain at least one item' });
        }
        if (!branchId && deliveryAddress) {
            const branches = await prisma_1.default.branch.findMany();
            if (!branches.length) {
                return res.status(400).json({ message: 'No branches available' });
            }
            const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
            const input = normalize(deliveryAddress);
            let best = branches[0];
            let bestScore = 0;
            for (const branch of branches) {
                const branchNorm = normalize(branch.address || '');
                let score = 0;
                for (let i = 0; i < Math.min(branchNorm.length, input.length); i++) {
                    if (branchNorm[i] === input[i])
                        score++;
                }
                if (score > bestScore) {
                    best = branch;
                    bestScore = score;
                }
            }
            branchId = best.id;
        }
        if (!branchId) {
            return res.status(400).json({ message: 'No branchId or delivery address provided' });
        }
        const orderItems = [];
        let totalAmount = 0;
        for (const item of items) {
            const menuItem = await prisma_1.default.menuItem.findUnique({
                where: { id: item.menuItemId }
            });
            if (!menuItem) {
                return res.status(404).json({
                    message: `Menu item ${item.menuItemId} not found`
                });
            }
            if (!menuItem.isAvailable) {
                return res.status(400).json({
                    message: `Menu item ${menuItem.name} is not available`
                });
            }
            const subtotal = menuItem.price * item.quantity;
            totalAmount += subtotal;
            orderItems.push({
                menuItemId: menuItem.id,
                quantity: item.quantity,
                unitPrice: menuItem.price,
                subtotal
            });
        }
        const order = await prisma_1.default.order.create({
            data: {
                branchId: Number(branchId),
                customerId: actualCustomerId,
                status: 'PENDING',
                totalAmount,
                deliveryAddress: deliveryAddress || null,
                items: {
                    create: orderItems
                }
            },
            include: {
                items: {
                    include: {
                        menuItem: true
                    }
                }
            }
        });
        return res.status(201).json(order);
    }
    catch (error) {
        return (0, errorHandler_1.handleError)(error, res);
    }
};
exports.createOrder = createOrder;
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const user = req.user;
        if (user.role === 'CHEF' && !['PREPARING', 'READY'].includes(status)) {
            res.status(403).json({ message: 'Chefs can only mark orders as preparing or ready' });
            return;
        }
        if (user.role === 'CASHIER' && !['DELIVERED', 'CANCELLED'].includes(status)) {
            res.status(403).json({ message: 'Cashiers can only mark orders as delivered or cancelled' });
            return;
        }
        const currentOrder = await prisma_1.default.order.findUnique({
            where: { id: Number(id) },
            include: { payment: true }
        });
        if (!currentOrder) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        const validTransitions = {
            PENDING: ['PREPARING', 'CANCELLED', 'DELIVERED'],
            PREPARING: ['READY', 'CANCELLED'],
            READY: ['DELIVERED', 'CANCELLED'],
            DELIVERED: [],
            CANCELLED: []
        };
        if (!validTransitions[currentOrder.status].includes(status)) {
            res.status(400).json({
                message: `Cannot transition from ${currentOrder.status} to ${status}`
            });
            return;
        }
        if (status === 'CANCELLED' && currentOrder.payment) {
            await prisma_1.default.payment.update({
                where: { id: currentOrder.payment.id },
                data: { status: 'REFUNDED' }
            });
        }
        const order = await prisma_1.default.order.update({
            where: { id: Number(id) },
            data: { status },
            include: {
                items: {
                    include: {
                        menuItem: true
                    }
                },
                payment: true
            }
        });
        res.json({
            message: 'Order status updated successfully',
            order
        });
    }
    catch (error) {
        console.error('Error in updateOrderStatus:', error);
        res.status(500).json({ message: 'Error updating order status' });
    }
};
exports.updateOrderStatus = updateOrderStatus;
const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const order = await prisma_1.default.order.findUnique({
            where: { id: Number(id) },
            include: { payment: true }
        });
        if (!['ADMIN', 'BRANCH_MANAGER'].includes(user.role)) {
            res.status(403).json({ message: 'Unauthorized to delete orders' });
            return;
        }
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        if (order.status === 'DELIVERED') {
            res.status(400).json({ message: 'Cannot delete delivered orders' });
            return;
        }
        if (order.payment) {
            await prisma_1.default.payment.update({
                where: { id: order.payment.id },
                data: { status: 'REFUNDED' }
            });
        }
        await prisma_1.default.order.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Order deleted successfully' });
    }
    catch (error) {
        console.error('Error in deleteOrder:', error);
        res.status(500).json({ message: 'Error deleting order' });
    }
};
exports.deleteOrder = deleteOrder;
//# sourceMappingURL=orderController.js.map