"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailReceipt = exports.reprintReceipt = exports.getPayment = exports.processPayment = void 0;
const errorHandler_1 = require("../utils/errorHandler");
const prisma_1 = __importDefault(require("../utils/prisma"));
const processPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { amount, method } = req.body;
        const user = req.user;
        if (!amount || !method) {
            res.status(400).json({ message: 'Amount and payment method are required' });
            return;
        }
        const order = await prisma_1.default.order.findUnique({
            where: { id: Number(orderId) },
            include: { payment: true }
        });
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        if (user.role === 'CUSTOMER' && order.customerId !== user.id) {
            res.status(403).json({ message: 'Unauthorized to pay for this order' });
            return;
        }
        if (user.role === 'CASHIER' && order.branchId !== user.branchId) {
            res.status(403).json({ message: 'Unauthorized to process payment for this order' });
            return;
        }
        if (order.payment) {
            res.status(400).json({ message: 'Payment already processed for this order' });
            return;
        }
        if (Math.abs(amount - order.totalAmount) > 0.01) {
            res.status(400).json({ message: 'Payment amount does not match order total' });
            return;
        }
        const payment = await prisma_1.default.payment.create({
            data: {
                orderId: Number(orderId),
                amount: parseFloat(amount),
                method: method,
                status: 'COMPLETED'
            }
        });
        res.status(201).json({
            message: 'Payment processed successfully',
            payment
        });
    }
    catch (error) {
        console.error('Error in processPayment:', error);
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.processPayment = processPayment;
const getPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const user = req.user;
        const payment = await prisma_1.default.payment.findUnique({
            where: { orderId: Number(orderId) },
            include: {
                order: {
                    select: {
                        customerId: true,
                        branchId: true
                    }
                }
            }
        });
        if (!payment) {
            res.status(404).json({ message: 'Payment not found' });
            return;
        }
        if (user.role === 'CUSTOMER' && payment.order.customerId !== user.id) {
            res.status(403).json({ message: 'Unauthorized to view this payment' });
            return;
        }
        if (user.role === 'CASHIER' && payment.order.branchId !== user.branchId) {
            res.status(403).json({ message: 'Unauthorized to view this payment' });
            return;
        }
        res.json(payment);
    }
    catch (error) {
        console.error('Error in getPayment:', error);
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.getPayment = getPayment;
const reprintReceipt = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const user = req.user;
        const payment = await prisma_1.default.payment.findUnique({
            where: { id: Number(paymentId) },
            include: {
                order: {
                    include: {
                        items: {
                            include: {
                                menuItem: true
                            }
                        },
                        customer: true
                    }
                }
            }
        });
        if (!payment) {
            res.status(404).json({ message: 'Payment not found' });
            return;
        }
        if (user.role === 'CASHIER' && payment.order.branchId !== user.branchId) {
            res.status(403).json({ message: 'Unauthorized to reprint this receipt' });
            return;
        }
        res.json({
            message: 'Receipt reprinted successfully',
            receipt: payment
        });
    }
    catch (error) {
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.reprintReceipt = reprintReceipt;
const emailReceipt = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { email } = req.body;
        const user = req.user;
        if (!email) {
            res.status(400).json({ message: 'Email address is required' });
            return;
        }
        const payment = await prisma_1.default.payment.findUnique({
            where: { id: Number(paymentId) },
            include: {
                order: {
                    include: {
                        items: {
                            include: {
                                menuItem: true
                            }
                        },
                        customer: true
                    }
                }
            }
        });
        if (!payment) {
            res.status(404).json({ message: 'Payment not found' });
            return;
        }
        if (user.role === 'CASHIER' && payment.order.branchId !== user.branchId) {
            res.status(403).json({ message: 'Unauthorized to email this receipt' });
            return;
        }
        console.log(`Receipt for payment ${paymentId} sent to ${email}`);
        res.json({
            message: `Receipt emailed successfully to ${email}`,
            receipt: payment
        });
    }
    catch (error) {
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.emailReceipt = emailReceipt;
//# sourceMappingURL=paymentController.js.map