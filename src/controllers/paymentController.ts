import { Request, Response } from 'express';
import { handleError } from '../utils/errorHandler';
import prisma from '../utils/prisma';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

// Process payment for an order
export const processPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { amount, method } = req.body;
    const user = req.user!;

    // Validate input
    if (!amount || !method) {
      res.status(400).json({ message: 'Amount and payment method are required' });
      return;
    }

    // Check if order exists and belongs to user (for customers) or is in their branch (for cashiers)
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: { payment: true }
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Authorization check
    if (user.role === 'CUSTOMER' && order.customerId !== user.id) {
      res.status(403).json({ message: 'Unauthorized to pay for this order' });
      return;
    }

    if (user.role === 'CASHIER' && order.branchId !== user.branchId) {
      res.status(403).json({ message: 'Unauthorized to process payment for this order' });
      return;
    }

    // Check if payment already exists
    if (order.payment) {
      res.status(400).json({ message: 'Payment already processed for this order' });
      return;
    }

    // Validate amount matches order total
    if (Math.abs(amount - order.totalAmount) > 0.01) {
      res.status(400).json({ message: 'Payment amount does not match order total' });
      return;
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        orderId: Number(orderId),
        amount: parseFloat(amount),
        method: method as PaymentMethod,
        status: 'COMPLETED' as PaymentStatus // Simulate successful payment
      }
    });

    res.status(201).json({
      message: 'Payment processed successfully',
      payment
    });
  } catch (error) {
    console.error('Error in processPayment:', error);
    handleError(error, res);
  }
};

// Get payment details for an order
export const getPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const user = req.user!;

    const payment = await prisma.payment.findUnique({
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

    // Authorization check
    if (user.role === 'CUSTOMER' && payment.order.customerId !== user.id) {
      res.status(403).json({ message: 'Unauthorized to view this payment' });
      return;
    }

    if (user.role === 'CASHIER' && payment.order.branchId !== user.branchId) {
      res.status(403).json({ message: 'Unauthorized to view this payment' });
      return;
    }

    res.json(payment);
  } catch (error) {
    console.error('Error in getPayment:', error);
    handleError(error, res);
  }
};

// Reprint receipt
export const reprintReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.params;
    const user = req.user!;

    const payment = await prisma.payment.findUnique({
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
  } catch (error) {
    handleError(error, res);
  }
};

// Email receipt
export const emailReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.params;
    const { email } = req.body;
    const user = req.user!;

    if (!email) {
      res.status(400).json({ message: 'Email address is required' });
      return;
    }

    const payment = await prisma.payment.findUnique({
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

    // Simulate email sending
    console.log(`Receipt for payment ${paymentId} sent to ${email}`);

    res.json({
      message: `Receipt emailed successfully to ${email}`,
      receipt: payment
    });
  } catch (error) {
    handleError(error, res);
  }
};
