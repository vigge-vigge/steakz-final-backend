import { Request, Response } from 'express';
import { handleError } from '../utils/errorHandler';
import prisma from '../utils/prisma';

/**
 * Create Receipt for an Order
 * Creates a receipt record in the database for a completed order
 */
export const createReceipt = async (req: Request, res: Response) => {
  try {
    const { orderId, subtotal, tax, discount = 0, total, paymentMethod, customerName } = req.body;
    const user = req.user;    if (!user || !['CUSTOMER', 'CASHIER', 'BRANCH_MANAGER', 'ADMIN'].includes(user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // For customers, verify they own the order
    if (user.role === 'CUSTOMER') {
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });
      
      if (!order || order.customerId !== user.id) {
        return res.status(403).json({ message: 'You can only create receipts for your own orders' });
      }
    }// Verify order exists and is completed
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if receipt already exists
    const existingReceipt = await prisma.receipt.findUnique({
      where: { orderId }
    });

    if (existingReceipt) {
      return res.status(400).json({ message: 'Receipt already exists for this order' });
    }    // Get user username from database
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { username: true }
    });

    if (!userRecord) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate unique receipt number
    const receiptNumber = `REC-${Date.now()}-${orderId}`;

    const receipt = await prisma.receipt.create({
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
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * Get all receipts with filtering
 */
export const getReceipts = async (req: Request, res: Response) => {
  try {
    const { branchId, startDate, endDate, paymentMethod } = req.query;
    const user = req.user;

    const whereClause: any = {};

    // Apply role-based filtering
    if (user?.role === 'CASHIER') {
      whereClause.cashierId = user.id;
    } else if (user?.role === 'BRANCH_MANAGER' && user.branchId) {
      whereClause.order = { branchId: user.branchId };
    }

    // Apply query filters
    if (branchId && ['ADMIN', 'GENERAL_MANAGER'].includes(user?.role || '')) {
      whereClause.order = { branchId: Number(branchId) };
    }
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate as string);
      if (endDate) whereClause.createdAt.lte = new Date(endDate as string);
    }
    
    if (paymentMethod) {
      whereClause.paymentMethod = paymentMethod;
    }

    const receipts = await prisma.receipt.findMany({
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
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * Get receipt by ID
 */
export const getReceiptById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const receipt = await prisma.receipt.findUnique({
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

    // Check access permissions
    if (user?.role === 'CASHIER' && receipt.cashierId !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (user?.role === 'BRANCH_MANAGER' && receipt.order.branchId !== user.branchId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.json(receipt);
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * Get receipt statistics
 */
export const getReceiptStats = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const whereClause: any = {};

    // Apply role-based filtering
    if (user?.role === 'CASHIER') {
      whereClause.cashierId = user.id;
    } else if (user?.role === 'BRANCH_MANAGER' && user.branchId) {
      whereClause.order = { branchId: user.branchId };
    }

    const [totalReceipts, totalRevenue, todayReceipts, todayRevenue] = await Promise.all([
      prisma.receipt.count({ where: whereClause }),
      prisma.receipt.aggregate({
        where: whereClause,
        _sum: { total: true }
      }),
      prisma.receipt.count({
        where: {
          ...whereClause,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.receipt.aggregate({
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
  } catch (error) {
    return handleError(error, res);
  }
};
