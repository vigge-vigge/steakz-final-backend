"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReceiptStats = exports.getReceiptById = exports.getReceipts = exports.createReceipt = void 0;
const errorHandler_1 = require("../utils/errorHandler");
const prisma_1 = __importDefault(require("../utils/prisma"));
const createReceipt = async (req, res) => {
    try {
        const { orderId, subtotal, tax, discount = 0, total, paymentMethod, customerName } = req.body;
        const user = req.user;
        if (!user || !['CUSTOMER', 'CASHIER', 'BRANCH_MANAGER', 'ADMIN'].includes(user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (user.role === 'CUSTOMER') {
            const order = await prisma_1.default.order.findUnique({
                where: { id: orderId }
            });
            if (!order || order.customerId !== user.id) {
                return res.status(403).json({ message: 'You can only create receipts for your own orders' });
            }
        }
        const order = await prisma_1.default.order.findUnique({
            where: { id: orderId }
        });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const existingReceipt = await prisma_1.default.receipt.findUnique({
            where: { orderId }
        });
        if (existingReceipt) {
            return res.status(400).json({ message: 'Receipt already exists for this order' });
        }
        const userRecord = await prisma_1.default.user.findUnique({
            where: { id: user.id },
            select: { username: true }
        });
        if (!userRecord) {
            return res.status(404).json({ message: 'User not found' });
        }
        const receiptNumber = `REC-${Date.now()}-${orderId}`;
        const receipt = await prisma_1.default.receipt.create({
            data: {
                receiptNumber,
                subtotal,
                tax,
                discount,
                total,
                paymentMethod,
                customerName,
                cashierName: userRecord.username,
                orderId,
                cashierId: user.id
            },
            include: {
                order: {
                    include: {
                        items: {
                            include: {
                                menuItem: true
                            }
                        },
                        customer: true,
                        branch: true
                    }
                },
                cashier: {
                    select: {
                        username: true
                    }
                }
            }
        });
        return res.status(201).json(receipt);
    }
    catch (error) {
        return (0, errorHandler_1.handleError)(error, res);
    }
};
exports.createReceipt = createReceipt;
const getReceipts = async (req, res) => {
    try {
        const { branchId, startDate, endDate, paymentMethod } = req.query;
        const user = req.user;
        const whereClause = {};
        if (user?.role === 'CASHIER') {
            whereClause.cashierId = user.id;
        }
        else if (user?.role === 'BRANCH_MANAGER' && user.branchId) {
            whereClause.order = { branchId: user.branchId };
        }
        if (branchId && ['ADMIN', 'GENERAL_MANAGER'].includes(user?.role || '')) {
            whereClause.order = { branchId: Number(branchId) };
        }
        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate)
                whereClause.createdAt.gte = new Date(startDate);
            if (endDate)
                whereClause.createdAt.lte = new Date(endDate);
        }
        if (paymentMethod) {
            whereClause.paymentMethod = paymentMethod;
        }
        const receipts = await prisma_1.default.receipt.findMany({
            where: whereClause,
            include: {
                order: {
                    include: {
                        items: {
                            include: {
                                menuItem: true
                            }
                        },
                        customer: true,
                        branch: true
                    }
                },
                cashier: {
                    select: {
                        username: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return res.json(receipts);
    }
    catch (error) {
        return (0, errorHandler_1.handleError)(error, res);
    }
};
exports.getReceipts = getReceipts;
const getReceiptById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const receipt = await prisma_1.default.receipt.findUnique({
            where: { id: Number(id) },
            include: {
                order: {
                    include: {
                        items: {
                            include: {
                                menuItem: true
                            }
                        },
                        customer: true,
                        branch: true
                    }
                },
                cashier: {
                    select: {
                        username: true
                    }
                }
            }
        });
        if (!receipt) {
            return res.status(404).json({ message: 'Receipt not found' });
        }
        if (user?.role === 'CASHIER' && receipt.cashierId !== user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (user?.role === 'BRANCH_MANAGER' && receipt.order.branchId !== user.branchId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        return res.json(receipt);
    }
    catch (error) {
        return (0, errorHandler_1.handleError)(error, res);
    }
};
exports.getReceiptById = getReceiptById;
const getReceiptStats = async (req, res) => {
    try {
        const user = req.user;
        const whereClause = {};
        if (user?.role === 'CASHIER') {
            whereClause.cashierId = user.id;
        }
        else if (user?.role === 'BRANCH_MANAGER' && user.branchId) {
            whereClause.order = { branchId: user.branchId };
        }
        const [totalReceipts, totalRevenue, todayReceipts, todayRevenue] = await Promise.all([
            prisma_1.default.receipt.count({ where: whereClause }),
            prisma_1.default.receipt.aggregate({
                where: whereClause,
                _sum: { total: true }
            }),
            prisma_1.default.receipt.count({
                where: {
                    ...whereClause,
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            }),
            prisma_1.default.receipt.aggregate({
                where: {
                    ...whereClause,
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                },
                _sum: { total: true }
            })
        ]);
        return res.json({
            totalReceipts,
            totalRevenue: totalRevenue._sum.total || 0,
            todayReceipts,
            todayRevenue: todayRevenue._sum.total || 0
        });
    }
    catch (error) {
        return (0, errorHandler_1.handleError)(error, res);
    }
};
exports.getReceiptStats = getReceiptStats;
//# sourceMappingURL=receiptController.js.map