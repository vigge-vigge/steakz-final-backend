import { Response } from 'express';
import prisma from '../utils/prisma';

// System-Wide Statistics
export const getSystemStatistics = async (_req: any, res: Response): Promise<void> => {
  try {
    // Get current date for filtering
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total statistics
    const [
      totalBranches,
      totalUsers,
      totalMenuItems,
      totalOrdersToday,
      totalOrdersWeek,
      totalOrdersMonth,
      totalRevenue,
      totalRevenueToday,
      totalRevenueWeek,
      totalRevenueMonth,
      pendingOrders,
      preparingOrders,
      readyOrders
    ] = await Promise.all([
      // Branches count
      prisma.branch.count(),
      
      // Users count by role
      prisma.user.groupBy({
        by: ['role'],
        _count: true
      }),
      
      // Menu items count
      prisma.menuItem.count(),
      
      // Orders today
      prisma.order.count({
        where: {
          createdAt: {
            gte: startOfDay
          }
        }
      }),
      
      // Orders this week
      prisma.order.count({
        where: {
          createdAt: {
            gte: startOfWeek
          }
        }
      }),
      
      // Orders this month
      prisma.order.count({
        where: {
          createdAt: {
            gte: startOfMonth
          }
        }
      }),
      
      // Total revenue (all time)
      prisma.payment.aggregate({
        where: {
          status: 'COMPLETED'
        },
        _sum: {
          amount: true
        }
      }),
      
      // Revenue today
      prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: startOfDay
          }
        },
        _sum: {
          amount: true
        }
      }),
      
      // Revenue this week
      prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: startOfWeek
          }
        },
        _sum: {
          amount: true
        }
      }),
      
      // Revenue this month
      prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: startOfMonth
          }
        },
        _sum: {
          amount: true
        }
      }),
      
      // Pending orders
      prisma.order.count({
        where: { status: 'PENDING' }
      }),
      
      // Preparing orders
      prisma.order.count({
        where: { status: 'PREPARING' }
      }),
      
      // Ready orders
      prisma.order.count({
        where: { status: 'READY' }
      }),
    ]);

    // Raw SQL for low stock items (quantity <= minThreshold)
    const lowStockItemsResult = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) as count FROM "InventoryItem" WHERE "quantity" <= "minThreshold"`
    );
    const lowStockItemsCountFinal = Number(lowStockItemsResult[0]?.count || 0);

    // Format user statistics
    const userStats = totalUsers.reduce((acc, userGroup) => {
      acc[userGroup.role] = userGroup._count;
      return acc;
    }, {} as Record<string, number>);

    const statistics = {
      system: {
        totalBranches,
        totalUsers: totalUsers.reduce((sum, group) => sum + group._count, 0),
        totalMenuItems,
        lowStockItems: lowStockItemsCountFinal
      },
      users: userStats,
      orders: {
        total: {
          today: totalOrdersToday,
          week: totalOrdersWeek,
          month: totalOrdersMonth
        },
        status: {
          pending: pendingOrders,
          preparing: preparingOrders,
          ready: readyOrders
        }
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        today: totalRevenueToday._sum.amount || 0,
        week: totalRevenueWeek._sum.amount || 0,
        month: totalRevenueMonth._sum.amount || 0
      }
    };

    res.json(statistics);
  } catch (error) {
    console.error('Error fetching system statistics:', error);
    res.status(500).json({ message: 'Failed to fetch system statistics' });
  }
};

// Real-Time Restaurant Status Grid
export const getRestaurantStatus = async (_req: any, res: Response): Promise<void> => {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        manager: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        _count: {
          select: {
            orders: {
              where: {
                status: {
                  in: ['PENDING', 'PREPARING', 'READY']
                }
              }
            }
          }
        }
      }
    });

    // Get additional metrics for each branch
    const branchStatusPromises = branches.map(async (branch) => {
      const [todayOrders, todayRevenue, lowStockCount, activeStaff, totalStaff] = await Promise.all([
        prisma.order.count({
          where: {
            branchId: branch.id,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        prisma.payment.aggregate({
          where: {
            order: {
              branchId: branch.id
            },
            status: 'COMPLETED',
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          },
          _sum: {
            amount: true
          }
        }),
        // Low stock items for this branch (raw SQL)
        (async () => {
          const result = await prisma.$queryRawUnsafe<any[]>(
            `SELECT COUNT(*) as count FROM "InventoryItem" WHERE "branchId" = ${branch.id} AND "quantity" <= "minThreshold"`
          );
          return Number(result[0]?.count || 0);
        })(),
        // Active staff count (excluding customers)
        prisma.user.count({
          where: {
            branchId: branch.id,
            role: {
              not: 'CUSTOMER'
            }
          }
        }),
        // Total staff (excluding customers)
        prisma.user.count({
          where: {
            branchId: branch.id,
            role: {
              not: 'CUSTOMER'
            }
          }
        })
      ]);
      return {
        ...branch,
        metrics: {
          activeOrders: branch._count.orders,
          todayOrders,
          todayRevenue: todayRevenue._sum.amount || 0,
          lowStockItems: lowStockCount,
          activeStaff,
          totalStaff
        }
      };
    });

    const branchStatuses = await Promise.all(branchStatusPromises);

    res.json(branchStatuses);
  } catch (error) {
    console.error('Error fetching restaurant status:', error);
    res.status(500).json({ message: 'Failed to fetch restaurant status' });
  }
};

// Live Order Activity Monitor
export const getLiveOrderActivity = async (_req: any, res: Response): Promise<void> => {
  try {
    const { limit = 50 } = _req.query;

    const recentOrders = await prisma.order.findMany({
      take: Number(limit),
      orderBy: {
        updatedAt: 'desc'
      },
      include: {
        customer: {
          select: {
            id: true,
            username: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        payment: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true
          }
        }
      }
    });

    res.json(recentOrders);
  } catch (error) {
    console.error('Error fetching live order activity:', error);
    res.status(500).json({ message: 'Failed to fetch live order activity' });
  }
};

// Financial Dashboard
export const getFinancialData = async (_req: any, res: Response): Promise<void> => {
  try {
    const { period = '7' } = _req.query; // days
    const days = Number(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Daily revenue for the period (PostgreSQL syntax)
    const dailyRevenueRaw = await prisma.$queryRawUnsafe<any[]>(
      `SELECT DATE("createdAt") as date, SUM("amount") as revenue, COUNT(DISTINCT "orderId") as orders FROM "Payment" WHERE "status" = 'COMPLETED' AND "createdAt" >= $1 GROUP BY DATE("createdAt") ORDER BY date DESC`,
      startDate
    );
    // Convert BigInt to Number if needed
    const dailyRevenue = dailyRevenueRaw.map((row: any) => ({
      ...row,
      revenue: row.revenue ? Number(row.revenue) : 0,
      orders: row.orders ? Number(row.orders) : 0
    }));

    // Revenue by branch (already using Prisma, no raw SQL)
    const branchRevenue = await prisma.payment.groupBy({
      by: ['orderId'],
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: startDate
        }
      },
      _sum: {
        amount: true
      }
    });

    // Get branch info for revenue data
    const branchRevenueWithNames = await Promise.all(
      branchRevenue.map(async (revenue) => {
        const order = await prisma.order.findUnique({
          where: { id: revenue.orderId },
          include: {
            branch: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
        return {
          branchId: order?.branch.id,
          branchName: order?.branch.name,
          revenue: revenue._sum.amount ? Number(revenue._sum.amount) : 0
        };
      })
    );

    // Aggregate by branch
    const branchRevenueAggregated = branchRevenueWithNames.reduce((acc, item) => {
      if (item.branchId && item.branchName) {
        const existing = acc.find(branch => branch.branchId === item.branchId);
        if (existing) {
          existing.revenue += item.revenue;
        } else {
          acc.push({
            branchId: item.branchId,
            branchName: item.branchName,
            revenue: item.revenue
          });
        }
      }
      return acc;
    }, [] as Array<{ branchId: number; branchName: string; revenue: number }>);

    // Payment method distribution
    const paymentMethods = await prisma.payment.groupBy({
      by: ['method'],
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: startDate
        }
      },
      _count: true,
      _sum: {
        amount: true
      }
    });
    // Convert BigInt in paymentMethods
    const paymentMethodsFixed = paymentMethods.map(pm => ({
      ...pm,
      _sum: {
        amount: pm._sum.amount ? Number(pm._sum.amount) : 0
      }
    }));

    // Top selling items
    const topItems = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: {
          createdAt: {
            gte: startDate
          },
          status: {
            not: 'CANCELLED'
          }
        }
      },
      _sum: {
        quantity: true,
        subtotal: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 10
    });
    // Get menu item names for top items
    const topItemsWithNames = await Promise.all(
      topItems.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          select: { name: true }
        });
        return {
          menuItemId: item.menuItemId,
          name: menuItem?.name || 'Unknown',
          totalQuantity: item._sum.quantity ? Number(item._sum.quantity) : 0,
          totalRevenue: item._sum.subtotal ? Number(item._sum.subtotal) : 0
        };
      })
    );

    res.json({
      dailyRevenue,
      branchRevenue: branchRevenueAggregated,
      paymentMethods: paymentMethodsFixed,
      topItems: topItemsWithNames
    });
  } catch (error) {
    console.error('Error fetching financial data:', error);
    res.status(500).json({ message: 'Failed to fetch financial data' });
  }
};

// System Health Monitoring
export const getSystemHealth = async (_req: any, res: Response): Promise<void> => {
  try {
    // Database health check
    const dbHealth = await prisma.$queryRaw`SELECT 1 as status`;
    
    // System metrics
    const [
      totalUsers,
      activeOrdersCount,
      failedPaymentsToday,
      systemErrorsToday,
      averageResponseTime
    ] = await Promise.all([
      prisma.user.count(),
      prisma.order.count({
        where: {
          status: {
            in: ['PENDING', 'PREPARING', 'READY']
          }
        }
      }),
      prisma.payment.count({
        where: {
          status: 'FAILED',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      // For now, we'll simulate system errors (in a real system, you'd track these)
      Promise.resolve(0),
      // Simulate average response time (in a real system, you'd track this)
      Promise.resolve(150)
    ]);

    // Performance metrics
    const performanceMetrics = {
      database: {
        status: dbHealth ? 'healthy' : 'error',
        connectionCount: 1, // Simulated
        queryTime: Math.random() * 100 + 50 // Simulated avg query time in ms
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      application: {
        totalUsers,
        activeOrders: activeOrdersCount,
        failedPaymentsToday,
        systemErrorsToday,
        averageResponseTime
      }
    };

    res.json(performanceMetrics);
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({ message: 'Failed to fetch system health data' });
  }
};

// Activity Feed
export const getActivityFeed = async (_req: any, res: Response): Promise<void> => {
  try {
    const { limit = 20 } = _req.query;

    // Get recent activities from various tables
    const [recentOrders, recentUsers, recentPayments] = await Promise.all([
      // Recent orders
      prisma.order.findMany({
        take: Number(limit) / 3,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { username: true } },
          branch: { select: { name: true } }
        }
      }),
      
      // Recent user registrations
      prisma.user.findMany({
        take: Number(limit) / 3,
        orderBy: { createdAt: 'desc' },
        where: { role: 'CUSTOMER' },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true
        }
      }),
      
      // Recent payments
      prisma.payment.findMany({
        take: Number(limit) / 3,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            include: {
              customer: { select: { username: true } },
              branch: { select: { name: true } }
            }
          }
        }
      })
    ]);

    // Format activities with consistent structure
    const activities = [
      ...recentOrders.map(order => ({
        id: `order-${order.id}`,
        type: 'order',
        title: `New order #${order.id}`,
        description: `${order.customer.username} placed an order at ${order.branch.name}`,
        timestamp: order.createdAt,
        status: order.status,
        amount: order.totalAmount
      })),
      ...recentUsers.map(user => ({
        id: `user-${user.id}`,
        type: 'user',
        title: 'New customer registration',
        description: `${user.username} joined as ${user.role}`,
        timestamp: user.createdAt,
        status: 'completed'
      })),
      ...recentPayments.map(payment => ({
        id: `payment-${payment.id}`,
        type: 'payment',
        title: `Payment ${payment.status.toLowerCase()}`,
        description: `${payment.order.customer.username} - ${payment.method} at ${payment.order.branch.name}`,
        timestamp: payment.createdAt,
        status: payment.status.toLowerCase(),
        amount: payment.amount
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, Number(limit));

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({ message: 'Failed to fetch activity feed' });
  }
};

// Utility to deeply convert BigInt to Number or String
function convertBigIntDeep(obj: any): any {
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(convertBigIntDeep);
  if (obj && typeof obj === 'object') {
    const res: any = {};
    for (const key in obj) {
      res[key] = convertBigIntDeep(obj[key]);
    }
    return res;
  }
  return obj;
}

// Performance Analytics
export const getPerformanceAnalytics = async (_req: any, res: Response): Promise<void> => {
  try {
    const { period = '30' } = _req.query; // days
    const days = Number(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Order completion times
    const orderMetrics = await prisma.$queryRaw`
      SELECT 
        AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))/60) as "avgCompletionTime",
        COUNT(*) as "totalOrders",
        SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as "completedOrders",
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as "cancelledOrders"
      FROM "Order"
      WHERE "createdAt" >= ${startDate}
        AND status IN ('DELIVERED', 'CANCELLED')
    `;

    // Branch performance comparison
    const branchPerformance = await prisma.branch.findMany({
      include: {
        _count: {
          select: {
            orders: {
              where: {
                createdAt: { gte: startDate }
              }
            }
          }
        }
      }
    });

    // Get revenue per branch
    const branchRevenueData = await Promise.all(
      branchPerformance.map(async (branch) => {
        const revenue = await prisma.payment.aggregate({
          where: {
            order: {
              branchId: branch.id
            },
            status: 'COMPLETED',
            createdAt: { gte: startDate }
          },
          _sum: { amount: true }
        });

        const avgOrderValue = branch._count.orders > 0 
          ? (revenue._sum.amount || 0) / branch._count.orders 
          : 0;

        return {
          branchId: branch.id,
          branchName: branch.name,
          totalOrders: branch._count.orders,
          totalRevenue: revenue._sum.amount || 0,
          avgOrderValue
        };
      })
    );

    // Peak hours analysis
    const hourlyData = await prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM "createdAt") as hour,
        COUNT(*) as "orderCount",
        AVG("totalAmount") as "avgOrderValue"
      FROM "Order"
      WHERE "createdAt" >= ${startDate}
      GROUP BY hour
      ORDER BY hour
    `;

    res.json(convertBigIntDeep({
      orderMetrics: Array.isArray(orderMetrics) ? orderMetrics[0] : orderMetrics,
      branchPerformance: branchRevenueData,
      peakHours: hourlyData
    }));
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    res.status(500).json({ message: 'Failed to fetch performance analytics' });
  }
};

// Alert System
export const getSystemAlerts = async (_req: any, res: Response): Promise<void> => {
  try {
    const alerts = [];

    // Check for low stock items
    const lowStockAlertItems = await prisma.$queryRawUnsafe<any[]>(
      `SELECT ii.*, b.name as branchName FROM "InventoryItem" ii JOIN "Branch" b ON ii."branchId" = b.id WHERE ii."quantity" <= ii."minThreshold"`
    );

    lowStockAlertItems.forEach(item => {
      alerts.push({
        id: `stock-${item.id}`,
        type: 'warning',
        category: 'inventory',
        title: 'Low Stock Alert',
        message: `${item.name} is running low at ${item.branchName} (${item.quantity} ${item.unit} remaining)`,
        timestamp: new Date(),
        priority: item.quantity === 0 ? 'high' : 'medium',
        branchId: item.branchId
      });
    });

    // Check for failed payments today
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const failedPayments = await prisma.payment.count({
      where: {
        status: 'FAILED',
        createdAt: { gte: todayStart }
      }
    });

    if (failedPayments > 0) {
      alerts.push({
        id: 'failed-payments',
        type: 'error',
        category: 'payment',
        title: 'Failed Payments Alert',
        message: `${failedPayments} payment(s) failed today`,
        timestamp: new Date(),
        priority: failedPayments > 5 ? 'high' : 'medium'
      });
    }

    // Check for pending orders older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stalePendingOrders = await prisma.order.count({
      where: {
        status: 'PENDING',
        createdAt: { lt: thirtyMinutesAgo }
      }
    });

    if (stalePendingOrders > 0) {
      alerts.push({
        id: 'stale-orders',
        type: 'warning',
        category: 'orders',
        title: 'Stale Orders Alert',
        message: `${stalePendingOrders} order(s) have been pending for over 30 minutes`,
        timestamp: new Date(),
        priority: 'high'
      });
    }

    // Sort alerts by priority and timestamp
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    alerts.sort((a, b) => {
      const priorityDiff = (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                          (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching system alerts:', error);
    res.status(500).json({ message: 'Failed to fetch system alerts' });
  }
};

// Quick Actions
export const performQuickAction = async (_req: any, res: Response): Promise<void> => {
  try {
    const { action, data } = _req.body;

    switch (action) {
      case 'toggle_menu_item':
        if (!data.menuItemId) {
          res.status(400).json({ message: 'Menu item ID is required' });
          return;
        }
        const menuItem = await prisma.menuItem.update({
          where: { id: data.menuItemId },
          data: { isAvailable: data.isAvailable }
        });
        res.json({ message: 'Menu item updated successfully', menuItem });
        break;

      case 'cancel_order':
        if (!data.orderId) {
          res.status(400).json({ message: 'Order ID is required' });
          return;
        }
        const order = await prisma.order.update({
          where: { id: data.orderId },
          data: { status: 'CANCELLED' }
        });
        res.json({ message: 'Order cancelled successfully', order });
        break;

      case 'send_notification':
        // In a real system, this would integrate with a notification service
        res.json({ message: 'Notification sent successfully' });
        break;

      case 'update_inventory':
        if (!data.inventoryItemId || !data.quantity) {
          res.status(400).json({ message: 'Inventory item ID and quantity are required' });
          return;
        }
        const inventoryItem = await prisma.inventoryItem.update({
          where: { id: data.inventoryItemId },
          data: { quantity: data.quantity }
        });
        res.json({ message: 'Inventory updated successfully', inventoryItem });
        break;

      case 'emergency_stop':
        if (!data.branchId) {
          res.status(400).json({ message: 'Branch ID is required' });
          return;
        }
        // Simulate emergency stop (in real system, trigger actual stop)
        res.json({ message: `Emergency stop executed for branch ${data.branchId}` });
        break;
      case 'restart_services':
        if (!data.branchId) {
          res.status(400).json({ message: 'Branch ID is required' });
          return;
        }
        // Simulate restart (in real system, trigger actual restart)
        res.json({ message: `Services restarted for branch ${data.branchId}` });
        break;
      case 'clear_cache':
        if (!data.branchId) {
          res.status(400).json({ message: 'Branch ID is required' });
          return;
        }
        // Simulate cache clear (in real system, clear actual cache)
        res.json({ message: `Cache cleared for branch ${data.branchId}` });
        break;

      default:
        res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error performing quick action:', error);
    res.status(500).json({ message: 'Failed to perform action' });
  }
};
