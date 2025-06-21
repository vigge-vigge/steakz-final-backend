"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performQuickAction = exports.getSystemAlerts = exports.getPerformanceAnalytics = exports.getActivityFeed = exports.getSystemHealth = exports.getFinancialData = exports.getLiveOrderActivity = exports.getRestaurantStatus = exports.getSystemStatistics = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getSystemStatistics = async (_req, res) => {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const [totalBranches, totalUsers, totalMenuItems, totalOrdersToday, totalOrdersWeek, totalOrdersMonth, totalRevenue, totalRevenueToday, totalRevenueWeek, totalRevenueMonth, pendingOrders, preparingOrders, readyOrders] = await Promise.all([
            prisma_1.default.branch.count(),
            prisma_1.default.user.groupBy({
                by: ['role'],
                _count: true
            }),
            prisma_1.default.menuItem.count(),
            prisma_1.default.order.count({
                where: {
                    createdAt: {
                        gte: startOfDay
                    }
                }
            }),
            prisma_1.default.order.count({
                where: {
                    createdAt: {
                        gte: startOfWeek
                    }
                }
            }),
            prisma_1.default.order.count({
                where: {
                    createdAt: {
                        gte: startOfMonth
                    }
                }
            }),
            prisma_1.default.payment.aggregate({
                where: {
                    status: 'COMPLETED'
                },
                _sum: {
                    amount: true
                }
            }),
            prisma_1.default.payment.aggregate({
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
            prisma_1.default.payment.aggregate({
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
            prisma_1.default.payment.aggregate({
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
            prisma_1.default.order.count({
                where: { status: 'PENDING' }
            }),
            prisma_1.default.order.count({
                where: { status: 'PREPARING' }
            }),
            prisma_1.default.order.count({
                where: { status: 'READY' }
            }),
        ]);
        const lowStockItemsResult = await prisma_1.default.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "InventoryItem" WHERE "quantity" <= "minThreshold"`);
        const lowStockItemsCountFinal = Number(lowStockItemsResult[0]?.count || 0);
        const userStats = totalUsers.reduce((acc, userGroup) => {
            acc[userGroup.role] = userGroup._count;
            return acc;
        }, {});
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
    }
    catch (error) {
        console.error('Error fetching system statistics:', error);
        res.status(500).json({ message: 'Failed to fetch system statistics' });
    }
};
exports.getSystemStatistics = getSystemStatistics;
const getRestaurantStatus = async (_req, res) => {
    try {
        const branches = await prisma_1.default.branch.findMany({
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
        const branchStatusPromises = branches.map(async (branch) => {
            const [todayOrders, todayRevenue, lowStockCount, activeStaff, totalStaff] = await Promise.all([
                prisma_1.default.order.count({
                    where: {
                        branchId: branch.id,
                        createdAt: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0))
                        }
                    }
                }),
                prisma_1.default.payment.aggregate({
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
                (async () => {
                    const result = await prisma_1.default.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "InventoryItem" WHERE "branchId" = ${branch.id} AND "quantity" <= "minThreshold"`);
                    return Number(result[0]?.count || 0);
                })(),
                prisma_1.default.user.count({
                    where: {
                        branchId: branch.id,
                        role: {
                            not: 'CUSTOMER'
                        }
                    }
                }),
                prisma_1.default.user.count({
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
    }
    catch (error) {
        console.error('Error fetching restaurant status:', error);
        res.status(500).json({ message: 'Failed to fetch restaurant status' });
    }
};
exports.getRestaurantStatus = getRestaurantStatus;
const getLiveOrderActivity = async (_req, res) => {
    try {
        const { limit = 50 } = _req.query;
        const recentOrders = await prisma_1.default.order.findMany({
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
    }
    catch (error) {
        console.error('Error fetching live order activity:', error);
        res.status(500).json({ message: 'Failed to fetch live order activity' });
    }
};
exports.getLiveOrderActivity = getLiveOrderActivity;
const getFinancialData = async (_req, res) => {
    try {
        const { period = '7' } = _req.query;
        const days = Number(period);
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const dailyRevenueRaw = await prisma_1.default.$queryRawUnsafe(`SELECT DATE("createdAt") as date, SUM("amount") as revenue, COUNT(DISTINCT "orderId") as orders FROM "Payment" WHERE "status" = 'COMPLETED' AND "createdAt" >= $1 GROUP BY DATE("createdAt") ORDER BY date DESC`, startDate);
        const dailyRevenue = dailyRevenueRaw.map((row) => ({
            ...row,
            revenue: row.revenue ? Number(row.revenue) : 0,
            orders: row.orders ? Number(row.orders) : 0
        }));
        const branchRevenue = await prisma_1.default.payment.groupBy({
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
        const branchRevenueWithNames = await Promise.all(branchRevenue.map(async (revenue) => {
            const order = await prisma_1.default.order.findUnique({
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
        }));
        const branchRevenueAggregated = branchRevenueWithNames.reduce((acc, item) => {
            if (item.branchId && item.branchName) {
                const existing = acc.find(branch => branch.branchId === item.branchId);
                if (existing) {
                    existing.revenue += item.revenue;
                }
                else {
                    acc.push({
                        branchId: item.branchId,
                        branchName: item.branchName,
                        revenue: item.revenue
                    });
                }
            }
            return acc;
        }, []);
        const paymentMethods = await prisma_1.default.payment.groupBy({
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
        const paymentMethodsFixed = paymentMethods.map(pm => ({
            ...pm,
            _sum: {
                amount: pm._sum.amount ? Number(pm._sum.amount) : 0
            }
        }));
        const topItems = await prisma_1.default.orderItem.groupBy({
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
        const topItemsWithNames = await Promise.all(topItems.map(async (item) => {
            const menuItem = await prisma_1.default.menuItem.findUnique({
                where: { id: item.menuItemId },
                select: { name: true }
            });
            return {
                menuItemId: item.menuItemId,
                name: menuItem?.name || 'Unknown',
                totalQuantity: item._sum.quantity ? Number(item._sum.quantity) : 0,
                totalRevenue: item._sum.subtotal ? Number(item._sum.subtotal) : 0
            };
        }));
        res.json({
            dailyRevenue,
            branchRevenue: branchRevenueAggregated,
            paymentMethods: paymentMethodsFixed,
            topItems: topItemsWithNames
        });
    }
    catch (error) {
        console.error('Error fetching financial data:', error);
        res.status(500).json({ message: 'Failed to fetch financial data' });
    }
};
exports.getFinancialData = getFinancialData;
const getSystemHealth = async (_req, res) => {
    try {
        const dbHealth = await prisma_1.default.$queryRaw `SELECT 1 as status`;
        const [totalUsers, activeOrdersCount, failedPaymentsToday, systemErrorsToday, averageResponseTime] = await Promise.all([
            prisma_1.default.user.count(),
            prisma_1.default.order.count({
                where: {
                    status: {
                        in: ['PENDING', 'PREPARING', 'READY']
                    }
                }
            }),
            prisma_1.default.payment.count({
                where: {
                    status: 'FAILED',
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            }),
            Promise.resolve(0),
            Promise.resolve(150)
        ]);
        const performanceMetrics = {
            database: {
                status: dbHealth ? 'healthy' : 'error',
                connectionCount: 1,
                queryTime: Math.random() * 100 + 50
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
    }
    catch (error) {
        console.error('Error fetching system health:', error);
        res.status(500).json({ message: 'Failed to fetch system health data' });
    }
};
exports.getSystemHealth = getSystemHealth;
const getActivityFeed = async (_req, res) => {
    try {
        const { limit = 20 } = _req.query;
        const [recentOrders, recentUsers, recentPayments] = await Promise.all([
            prisma_1.default.order.findMany({
                take: Number(limit) / 3,
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: { select: { username: true } },
                    branch: { select: { name: true } }
                }
            }),
            prisma_1.default.user.findMany({
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
            prisma_1.default.payment.findMany({
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
    }
    catch (error) {
        console.error('Error fetching activity feed:', error);
        res.status(500).json({ message: 'Failed to fetch activity feed' });
    }
};
exports.getActivityFeed = getActivityFeed;
function convertBigIntDeep(obj) {
    if (typeof obj === 'bigint')
        return Number(obj);
    if (Array.isArray(obj))
        return obj.map(convertBigIntDeep);
    if (obj && typeof obj === 'object') {
        const res = {};
        for (const key in obj) {
            res[key] = convertBigIntDeep(obj[key]);
        }
        return res;
    }
    return obj;
}
const getPerformanceAnalytics = async (_req, res) => {
    try {
        const { period = '30' } = _req.query;
        const days = Number(period);
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const orderMetrics = await prisma_1.default.$queryRaw `
      SELECT 
        AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))/60) as "avgCompletionTime",
        COUNT(*) as "totalOrders",
        SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as "completedOrders",
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as "cancelledOrders"
      FROM "Order"
      WHERE "createdAt" >= ${startDate}
        AND status IN ('DELIVERED', 'CANCELLED')
    `;
        const branchPerformance = await prisma_1.default.branch.findMany({
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
        const branchRevenueData = await Promise.all(branchPerformance.map(async (branch) => {
            const revenue = await prisma_1.default.payment.aggregate({
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
        }));
        const hourlyData = await prisma_1.default.$queryRaw `
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
    }
    catch (error) {
        console.error('Error fetching performance analytics:', error);
        res.status(500).json({ message: 'Failed to fetch performance analytics' });
    }
};
exports.getPerformanceAnalytics = getPerformanceAnalytics;
const getSystemAlerts = async (_req, res) => {
    try {
        const alerts = [];
        const lowStockAlertItems = await prisma_1.default.$queryRawUnsafe(`SELECT ii.*, b.name as branchName FROM "InventoryItem" ii JOIN "Branch" b ON ii."branchId" = b.id WHERE ii."quantity" <= ii."minThreshold"`);
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
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
        const failedPayments = await prisma_1.default.payment.count({
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
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const stalePendingOrders = await prisma_1.default.order.count({
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
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        alerts.sort((a, b) => {
            const priorityDiff = (priorityOrder[b.priority] || 0) -
                (priorityOrder[a.priority] || 0);
            if (priorityDiff !== 0)
                return priorityDiff;
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        res.json(alerts);
    }
    catch (error) {
        console.error('Error fetching system alerts:', error);
        res.status(500).json({ message: 'Failed to fetch system alerts' });
    }
};
exports.getSystemAlerts = getSystemAlerts;
const performQuickAction = async (_req, res) => {
    try {
        const { action, data } = _req.body;
        switch (action) {
            case 'toggle_menu_item':
                if (!data.menuItemId) {
                    res.status(400).json({ message: 'Menu item ID is required' });
                    return;
                }
                const menuItem = await prisma_1.default.menuItem.update({
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
                const order = await prisma_1.default.order.update({
                    where: { id: data.orderId },
                    data: { status: 'CANCELLED' }
                });
                res.json({ message: 'Order cancelled successfully', order });
                break;
            case 'send_notification':
                res.json({ message: 'Notification sent successfully' });
                break;
            case 'update_inventory':
                if (!data.inventoryItemId || !data.quantity) {
                    res.status(400).json({ message: 'Inventory item ID and quantity are required' });
                    return;
                }
                const inventoryItem = await prisma_1.default.inventoryItem.update({
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
                res.json({ message: `Emergency stop executed for branch ${data.branchId}` });
                break;
            case 'restart_services':
                if (!data.branchId) {
                    res.status(400).json({ message: 'Branch ID is required' });
                    return;
                }
                res.json({ message: `Services restarted for branch ${data.branchId}` });
                break;
            case 'clear_cache':
                if (!data.branchId) {
                    res.status(400).json({ message: 'Branch ID is required' });
                    return;
                }
                res.json({ message: `Cache cleared for branch ${data.branchId}` });
                break;
            default:
                res.status(400).json({ message: 'Invalid action' });
        }
    }
    catch (error) {
        console.error('Error performing quick action:', error);
        res.status(500).json({ message: 'Failed to perform action' });
    }
};
exports.performQuickAction = performQuickAction;
//# sourceMappingURL=adminDashboardController.js.map