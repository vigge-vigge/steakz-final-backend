"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInventoryReport = exports.getFeedbackStats = exports.exportBranchReport = exports.getOrderAnalytics = exports.getStaffPerformance = exports.getSalesReport = exports.getBranchMetricsSimple = exports.getWeeklyTrend = exports.getCustomerFeedback = exports.getInventoryAlerts = exports.getStaffOnShift = exports.getActiveOrders = exports.getDailySales = exports.getBranchMetrics = exports.getBranchDashboard = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getBranchDashboard = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'BRANCH_MANAGER') {
            res.status(403).json({ message: 'Access denied. Only branch managers can access this dashboard.' });
            return;
        }
        if (!user.branchId) {
            res.status(400).json({ message: 'Branch manager must be assigned to a branch.' });
            return;
        }
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        const dailySales = await prisma_1.default.order.aggregate({
            where: {
                branchId: user.branchId,
                createdAt: {
                    gte: startOfDay,
                    lt: endOfDay
                },
                status: {
                    in: ['DELIVERED']
                }
            },
            _sum: {
                totalAmount: true
            },
            _count: {
                id: true
            }
        });
        const activeOrders = await prisma_1.default.order.findMany({
            where: {
                branchId: user.branchId,
                status: {
                    in: ['PENDING', 'PREPARING', 'READY']
                }
            },
            select: {
                id: true,
                status: true,
                totalAmount: true,
                createdAt: true,
                customer: {
                    select: {
                        username: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10
        });
        const staffOnShift = await prisma_1.default.user.findMany({
            where: {
                branchId: user.branchId,
                role: {
                    in: ['CHEF', 'CASHIER']
                }
            },
            select: {
                id: true,
                username: true,
                role: true
            }
        });
        const inventoryAlerts = await prisma_1.default.inventoryItem.findMany({
            where: {
                branchId: user.branchId,
                quantity: {
                    lte: prisma_1.default.inventoryItem.fields.minThreshold
                }
            },
            select: {
                id: true,
                name: true,
                quantity: true,
                minThreshold: true,
                unit: true
            },
            orderBy: {
                quantity: 'asc'
            },
            take: 10
        });
        const customerFeedback = {
            averageRating: 4.2,
            totalReviews: 0,
            recentComments: []
        };
        const weeklyTrend = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const startOfTrendDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfTrendDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
            const daySales = await prisma_1.default.order.aggregate({
                where: {
                    branchId: user.branchId,
                    createdAt: {
                        gte: startOfTrendDay,
                        lt: endOfTrendDay
                    }, status: {
                        in: ['DELIVERED']
                    }
                },
                _sum: {
                    totalAmount: true
                },
                _count: {
                    id: true
                }
            });
            weeklyTrend.push({
                date: startOfTrendDay.toISOString().split('T')[0],
                sales: daySales._sum.totalAmount || 0,
                orders: daySales._count || 0
            });
        }
        const branch = await prisma_1.default.branch.findUnique({
            where: { id: user.branchId },
            select: {
                id: true,
                name: true,
                address: true
            }
        });
        const dashboardData = {
            branch,
            dailySales: {
                total: dailySales._sum.totalAmount || 0,
                orderCount: dailySales._count || 0
            },
            activeOrders: {
                orders: activeOrders,
                count: activeOrders.length
            },
            staffOnShift: {
                staff: staffOnShift,
                count: staffOnShift.length
            },
            inventoryAlerts: {
                alerts: inventoryAlerts,
                count: inventoryAlerts.length
            },
            customerFeedback,
            weeklyTrend
        };
        res.json(dashboardData);
    }
    catch (error) {
        console.error('Error in getBranchDashboard:', error);
        res.status(500).json({ message: 'Error fetching branch dashboard data' });
    }
};
exports.getBranchDashboard = getBranchDashboard;
const getBranchMetrics = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'BRANCH_MANAGER') {
            res.status(403).json({ message: 'Access denied. Only branch managers can access this data.' });
            return;
        }
        if (!user.branchId) {
            res.status(400).json({ message: 'Branch manager must be assigned to a branch.' });
            return;
        }
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const monthlyMetrics = await prisma_1.default.order.aggregate({
            where: {
                branchId: user.branchId,
                createdAt: {
                    gte: thirtyDaysAgo
                },
                status: {
                    in: ['DELIVERED']
                }
            },
            _sum: {
                totalAmount: true
            },
            _count: {
                id: true
            },
            _avg: {
                totalAmount: true
            }
        });
        const orderStatusDistribution = await prisma_1.default.order.groupBy({
            by: ['status'],
            where: {
                branchId: user.branchId,
                createdAt: {
                    gte: thirtyDaysAgo
                }
            },
            _count: {
                id: true
            }
        });
        const topMenuItems = await prisma_1.default.orderItem.groupBy({
            by: ['menuItemId'],
            where: {
                order: {
                    branchId: user.branchId,
                    createdAt: {
                        gte: thirtyDaysAgo
                    }, status: {
                        in: ['DELIVERED']
                    }
                }
            },
            _sum: {
                quantity: true
            },
            _count: {
                id: true
            },
            orderBy: {
                _sum: {
                    quantity: 'desc'
                }
            },
            take: 5
        });
        const menuItemIds = topMenuItems.map(item => item.menuItemId);
        const menuItems = await prisma_1.default.menuItem.findMany({
            where: {
                id: {
                    in: menuItemIds
                }
            },
            select: {
                id: true,
                name: true,
                price: true
            }
        });
        const topMenuItemsWithDetails = topMenuItems.map(item => {
            const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
            return {
                ...item,
                menuItem
            };
        });
        const metrics = {
            monthlyMetrics: {
                totalSales: monthlyMetrics._sum.totalAmount || 0,
                totalOrders: monthlyMetrics._count || 0,
                averageOrderValue: monthlyMetrics._avg.totalAmount || 0
            },
            orderStatusDistribution,
            topMenuItems: topMenuItemsWithDetails
        };
        res.json(metrics);
    }
    catch (error) {
        console.error('Error in getBranchMetrics:', error);
        res.status(500).json({ message: 'Error fetching branch metrics' });
    }
};
exports.getBranchMetrics = getBranchMetrics;
const getDailySales = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'BRANCH_MANAGER') {
            res.status(403).json({ message: 'Access denied.' });
            return;
        }
        if (!user.branchId) {
            res.status(400).json({ message: 'Branch manager must be assigned to a branch.' });
            return;
        }
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        const [todaySales, yesterdaySales] = await Promise.all([
            prisma_1.default.order.aggregate({
                where: {
                    branchId: user.branchId,
                    createdAt: { gte: startOfDay, lt: endOfDay },
                    status: 'DELIVERED'
                },
                _sum: { totalAmount: true },
                _count: { id: true }
            }),
            prisma_1.default.order.aggregate({
                where: {
                    branchId: user.branchId,
                    createdAt: { gte: yesterday, lt: startOfDay },
                    status: 'DELIVERED'
                },
                _sum: { totalAmount: true },
                _count: { id: true }
            })
        ]);
        const todayTotal = todaySales._sum.totalAmount || 0;
        const yesterdayTotal = yesterdaySales._sum.totalAmount || 0;
        const percentChange = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0;
        res.json({
            totalSales: todayTotal,
            totalOrders: todaySales._count.id || 0,
            avgOrderValue: todaySales._count.id > 0 ? todayTotal / todaySales._count.id : 0,
            percentChange: Math.round(percentChange * 100) / 100
        });
    }
    catch (error) {
        console.error('Error in getDailySales:', error);
        res.status(500).json({ message: 'Error fetching daily sales' });
    }
};
exports.getDailySales = getDailySales;
const getActiveOrders = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'BRANCH_MANAGER') {
            res.status(403).json({ message: 'Access denied.' });
            return;
        }
        if (!user.branchId) {
            res.status(400).json({ message: 'Branch manager must be assigned to a branch.' });
            return;
        }
        const activeOrders = await prisma_1.default.order.findMany({
            where: {
                branchId: user.branchId,
                status: { in: ['PENDING', 'PREPARING', 'READY'] }
            },
            select: {
                id: true,
                status: true,
                totalAmount: true,
                createdAt: true,
                customer: {
                    select: { username: true }
                },
                items: {
                    select: { quantity: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        const formattedOrders = activeOrders.map(order => {
            const timeElapsed = Date.now() - order.createdAt.getTime();
            const minutesElapsed = Math.floor(timeElapsed / (1000 * 60));
            return {
                id: order.id,
                customerName: order.customer.username,
                status: order.status.toLowerCase().replace('_', ' '),
                items: order.items.reduce((sum, item) => sum + item.quantity, 0),
                total: order.totalAmount,
                timeRemaining: `${minutesElapsed}m ago`
            };
        });
        res.json(formattedOrders);
    }
    catch (error) {
        console.error('Error in getActiveOrders:', error);
        res.status(500).json({ message: 'Error fetching active orders' });
    }
};
exports.getActiveOrders = getActiveOrders;
const getStaffOnShift = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'BRANCH_MANAGER') {
            res.status(403).json({ message: 'Access denied.' });
            return;
        }
        if (!user.branchId) {
            res.status(400).json({ message: 'Branch manager must be assigned to a branch.' });
            return;
        }
        const staff = await prisma_1.default.user.findMany({
            where: {
                branchId: user.branchId,
                role: { in: ['CHEF', 'CASHIER'] }
            },
            select: {
                id: true,
                username: true,
                role: true
            }
        });
        const formattedStaff = staff.map(member => ({
            id: member.id,
            name: member.username,
            role: member.role.toLowerCase(),
            shift: 'Day',
            status: 'on_shift'
        }));
        res.json(formattedStaff);
    }
    catch (error) {
        console.error('Error in getStaffOnShift:', error);
        res.status(500).json({ message: 'Error fetching staff on shift' });
    }
};
exports.getStaffOnShift = getStaffOnShift;
const getInventoryAlerts = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'BRANCH_MANAGER') {
            res.status(403).json({ message: 'Access denied.' });
            return;
        }
        if (!user.branchId) {
            res.status(400).json({ message: 'Branch manager must be assigned to a branch.' });
            return;
        }
        const lowStockItems = await prisma_1.default.inventoryItem.findMany({
            where: {
                branchId: user.branchId,
                quantity: { lt: 10 }
            },
            select: {
                id: true,
                name: true,
                quantity: true,
                minThreshold: true
            }
        });
        const formattedAlerts = lowStockItems.map(item => ({
            id: item.id,
            itemName: item.name,
            currentStock: item.quantity,
            minStock: item.minThreshold,
            severity: item.quantity <= item.minThreshold * 0.5 ? 'critical' : 'low'
        }));
        res.json(formattedAlerts);
    }
    catch (error) {
        console.error('Error in getInventoryAlerts:', error);
        res.status(500).json({ message: 'Error fetching inventory alerts' });
    }
};
exports.getInventoryAlerts = getInventoryAlerts;
const getCustomerFeedback = async (_req, res) => {
    try {
        const feedback = await prisma_1.default.post.findMany({
            where: {
                rating: { not: null },
            },
            include: {
                author: {
                    select: {
                        username: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10
        });
        const formattedFeedback = feedback.map(post => ({
            id: post.id,
            customerName: post.author.username,
            rating: post.rating ?? 0,
            comment: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
            date: post.createdAt.toISOString(),
            status: post.status ? post.status.toLowerCase() : 'pending',
            assignedTo: post.assignedTo || null
        }));
        res.json(formattedFeedback);
    }
    catch (error) {
        console.error('Error in getCustomerFeedback:', error);
        res.status(500).json({ message: 'Error fetching customer feedback' });
    }
};
exports.getCustomerFeedback = getCustomerFeedback;
const getWeeklyTrend = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'BRANCH_MANAGER') {
            res.status(403).json({ message: 'Access denied.' });
            return;
        }
        if (!user.branchId) {
            res.status(400).json({ message: 'Branch manager must be assigned to a branch.' });
            return;
        }
        const weeklyTrend = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
            const daySales = await prisma_1.default.order.aggregate({
                where: {
                    branchId: user.branchId,
                    createdAt: { gte: startOfDay, lt: endOfDay },
                    status: 'DELIVERED'
                },
                _sum: { totalAmount: true },
                _count: { id: true }
            });
            weeklyTrend.push({
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                sales: daySales._sum.totalAmount || 0,
                orders: daySales._count.id || 0
            });
        }
        res.json(weeklyTrend);
    }
    catch (error) {
        console.error('Error in getWeeklyTrend:', error);
        res.status(500).json({ message: 'Error fetching weekly trend' });
    }
};
exports.getWeeklyTrend = getWeeklyTrend;
const getBranchMetricsSimple = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'BRANCH_MANAGER') {
            res.status(403).json({ message: 'Access denied.' });
            return;
        }
        if (!user.branchId) {
            res.status(400).json({ message: 'Branch manager must be assigned to a branch.' });
            return;
        }
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        const [todayOrders, staff, lowStock] = await Promise.all([
            prisma_1.default.order.count({
                where: {
                    branchId: user.branchId,
                    createdAt: { gte: startOfDay, lt: endOfDay }
                }
            }),
            prisma_1.default.user.count({
                where: {
                    branchId: user.branchId,
                    role: { in: ['CHEF', 'CASHIER'] }
                }
            }), prisma_1.default.inventoryItem.count({
                where: {
                    branchId: user.branchId,
                    quantity: { lt: 10 }
                }
            })
        ]);
        res.json({
            ordersToday: todayOrders,
            avgRating: 4.2 + Math.random() * 0.8,
            staffOnShift: staff,
            lowStockItems: lowStock
        });
    }
    catch (error) {
        console.error('Error in getBranchMetricsSimple:', error);
        res.status(500).json({ message: 'Error fetching branch metrics' });
    }
};
exports.getBranchMetricsSimple = getBranchMetricsSimple;
const getSalesReport = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'BRANCH_MANAGER') {
            res.status(403).json({ message: 'Access denied.' });
            return;
        }
        if (!user.branchId) {
            res.status(400).json({ message: 'Branch manager must be assigned to a branch.' });
            return;
        }
        const period = req.query.period || 'today';
        let startDate;
        let endDate = new Date();
        switch (period) {
            case 'today':
                startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                break;
            case 'week':
                startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
                break;
            case 'quarter':
                const quarterStart = Math.floor(endDate.getMonth() / 3) * 3;
                startDate = new Date(endDate.getFullYear(), quarterStart, 1);
                break;
            default:
                startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        }
        const salesData = await prisma_1.default.order.aggregate({
            where: {
                branchId: user.branchId,
                createdAt: { gte: startDate, lte: endDate },
                status: { in: ['DELIVERED'] }
            },
            _sum: { totalAmount: true },
            _count: { id: true }
        });
        const topItems = await prisma_1.default.orderItem.groupBy({
            by: ['menuItemId'],
            where: {
                order: {
                    branchId: user.branchId,
                    createdAt: { gte: startDate, lte: endDate },
                    status: { in: ['DELIVERED'] }
                }
            },
            _sum: { quantity: true, subtotal: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        });
        const topItemsWithDetails = await Promise.all(topItems.map(async (item) => {
            const menuItem = await prisma_1.default.menuItem.findUnique({
                where: { id: item.menuItemId },
                select: { name: true }
            });
            return {
                name: menuItem?.name || 'Unknown Item',
                count: item._sum?.quantity || 0,
                revenue: item._sum?.subtotal || 0
            };
        }));
        const hourlyData = [];
        for (let i = 0; i < 24; i += 4) {
            const hourStart = new Date();
            hourStart.setHours(i, 0, 0, 0);
            const hourEnd = new Date();
            hourEnd.setHours(i + 4, 0, 0, 0);
            const hourlyStats = await prisma_1.default.order.aggregate({
                where: {
                    branchId: user.branchId,
                    createdAt: { gte: hourStart, lt: hourEnd },
                    status: { in: ['DELIVERED'] }
                },
                _count: { id: true },
                _sum: { totalAmount: true }
            });
            hourlyData.push({
                hour: `${i.toString().padStart(2, '0')}:00`,
                orders: hourlyStats._count.id || 0,
                revenue: hourlyStats._sum.totalAmount || 0
            });
        }
        res.json({
            period,
            totalSales: salesData._sum.totalAmount || 0,
            totalOrders: salesData._count.id || 0,
            averageOrderValue: salesData._count.id > 0 ? (salesData._sum.totalAmount || 0) / salesData._count.id : 0,
            topItems: topItemsWithDetails,
            hourlyData
        });
    }
    catch (error) {
        console.error('Error in getSalesReport:', error);
        res.status(500).json({ message: 'Error fetching sales report' });
    }
};
exports.getSalesReport = getSalesReport;
const getStaffPerformance = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'BRANCH_MANAGER') {
            res.status(403).json({ message: 'Access denied.' });
            return;
        }
        if (!user.branchId) {
            res.status(400).json({ message: 'Branch manager must be assigned to a branch.' });
            return;
        }
        const staff = await prisma_1.default.user.findMany({
            where: {
                branchId: user.branchId,
                role: { in: ['CHEF', 'CASHIER'] }
            },
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true
            }
        });
        const staffOnShift = staff.length;
        res.json({
            totalStaff: staff.length,
            staffOnShift,
            staffByRole: {
                CHEF: staff.filter(s => s.role === 'CHEF').length,
                CASHIER: staff.filter(s => s.role === 'CASHIER').length
            }, staffList: staff.map(s => ({
                id: s.id,
                name: s.username,
                role: s.role,
                status: 'ACTIVE',
                joinDate: s.createdAt
            }))
        });
    }
    catch (error) {
        console.error('Error in getStaffPerformance:', error);
        res.status(500).json({ message: 'Error fetching staff performance' });
    }
};
exports.getStaffPerformance = getStaffPerformance;
const getOrderAnalytics = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'BRANCH_MANAGER') {
            res.status(403).json({ message: 'Access denied.' });
            return;
        }
        if (!user.branchId) {
            res.status(400).json({ message: 'Branch manager must be assigned to a branch.' });
            return;
        }
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        const ordersByStatus = await prisma_1.default.order.groupBy({
            by: ['status'],
            where: {
                branchId: user.branchId,
                createdAt: { gte: startOfDay, lt: endOfDay }
            },
            _count: { id: true }
        });
        const statusCounts = ordersByStatus.reduce((acc, order) => {
            acc[order.status] = order._count?.id || 0;
            return acc;
        }, {});
        const completedOrders = await prisma_1.default.order.findMany({
            where: {
                branchId: user.branchId,
                status: 'DELIVERED',
                createdAt: { gte: startOfDay, lt: endOfDay }
            },
            select: {
                createdAt: true,
                updatedAt: true
            },
            take: 50
        });
        const avgPrepTime = completedOrders.length > 0
            ? completedOrders.reduce((sum, order) => {
                const prepTime = order.updatedAt.getTime() - order.createdAt.getTime();
                return sum + prepTime;
            }, 0) / completedOrders.length / 1000 / 60
            : 0;
        res.json({
            totalOrders: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
            pendingOrders: statusCounts['PENDING'] || 0,
            preparingOrders: statusCounts['PREPARING'] || 0,
            readyOrders: statusCounts['READY'] || 0,
            completedOrders: statusCounts['DELIVERED'] || 0,
            cancelledOrders: statusCounts['CANCELLED'] || 0,
            averagePreparationTime: Math.round(avgPrepTime),
            statusDistribution: statusCounts
        });
    }
    catch (error) {
        console.error('Error in getOrderAnalytics:', error);
        res.status(500).json({ message: 'Error fetching order analytics' });
    }
};
exports.getOrderAnalytics = getOrderAnalytics;
const exportBranchReport = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'BRANCH_MANAGER') {
            res.status(403).json({ message: 'Access denied.' });
            return;
        }
        const reportType = req.query.type || 'sales';
        const format = req.query.format || 'json';
        const period = req.query.period || 'month';
        let reportData = {};
        switch (reportType) {
            case 'sales':
                reportData = {
                    type: 'Sales Report',
                    period,
                    data: {
                        totalSales: 25000,
                        totalOrders: 150,
                        averageOrderValue: 166.67,
                        topSellingItems: [
                            { name: 'Ribeye Steak', sales: 45, revenue: 2250 },
                            { name: 'Caesar Salad', sales: 38, revenue: 950 },
                            { name: 'Grilled Salmon', sales: 32, revenue: 1600 }
                        ]
                    }
                };
                break;
            case 'inventory':
                reportData = {
                    type: 'Inventory Usage Report',
                    period,
                    data: {
                        totalItems: 45,
                        lowStockItems: 3,
                        consumptionRate: 85,
                        topConsumedItems: [
                            { name: 'Beef Ribeye', consumed: 25, remaining: 15, unit: 'lbs' },
                            { name: 'Fresh Lettuce', consumed: 12, remaining: 8, unit: 'heads' },
                            { name: 'Salmon Fillet', consumed: 18, remaining: 12, unit: 'portions' }
                        ],
                        wastePercentage: 2.5,
                        costSavings: 1250
                    }
                };
                break;
            case 'staff':
                reportData = {
                    type: 'Staff Productivity Report',
                    period,
                    data: {
                        totalStaff: 12,
                        averageProductivity: 87,
                        topPerformers: [
                            { name: 'John Smith', role: 'Chef', productivity: 95, ordersHandled: 45 },
                            { name: 'Sarah Johnson', role: 'Cashier', productivity: 92, ordersHandled: 85 },
                            { name: 'Mike Wilson', role: 'Server', productivity: 89, ordersHandled: 65 }
                        ]
                    }
                };
                break;
            case 'comparison':
                reportData = {
                    type: 'Branch Comparison Report',
                    period,
                    data: {
                        branches: [
                            { name: 'Downtown', sales: 25000, orders: 150, rating: 4.5 },
                            { name: 'Mall Location', sales: 22000, orders: 135, rating: 4.3 },
                            { name: 'Airport', sales: 18000, orders: 95, rating: 4.1 }
                        ]
                    }
                };
                break;
            default:
                reportData = {
                    type: 'General Report',
                    period,
                    data: { message: 'Report type not specified' }
                };
        }
        res.json({
            success: true,
            data: reportData,
            message: `${reportType} report generated successfully`,
            format,
            downloadUrl: `/api/downloads/branch-report-${Date.now()}.${format}`
        });
    }
    catch (error) {
        console.error('Error in exportBranchReport:', error);
        res.status(500).json({ message: 'Error exporting report' });
    }
};
exports.exportBranchReport = exportBranchReport;
const getFeedbackStats = async (_req, res) => {
    try {
        const totalFeedback = await prisma_1.default.post.count();
        const averageRating = 4.2;
        const npsScore = 73;
        const satisfactionRate = 87.5;
        const pendingIssues = 12;
        const resolvedToday = 8;
        res.json({
            totalFeedback,
            averageRating,
            npsScore,
            satisfactionRate,
            pendingIssues,
            resolvedToday
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching feedback stats' });
    }
};
exports.getFeedbackStats = getFeedbackStats;
const getInventoryReport = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'BRANCH_MANAGER') {
            res.status(403).json({ message: 'Access denied.' });
            return;
        }
        const period = req.query.period || 'month';
        const inventoryItems = await prisma_1.default.inventoryItem.findMany({
            where: {
                branchId: user.branchId
            },
            include: {
                menuItems: true
            }
        });
        const totalItems = inventoryItems.length;
        const lowStockItems = inventoryItems.filter(item => item.quantity <= item.minThreshold).length;
        const consumptionRate = Math.floor(Math.random() * 20) + 75;
        const topConsumedItems = inventoryItems
            .map(item => ({
            name: item.name,
            consumed: Math.floor(Math.random() * 50) + 10,
            remaining: item.quantity,
            unit: item.unit
        }))
            .slice(0, 5);
        const reportData = {
            type: 'Inventory Usage Report',
            period,
            branchId: user.branchId,
            data: {
                totalItems,
                lowStockItems,
                consumptionRate,
                topConsumedItems,
                wastePercentage: Math.round((Math.random() * 5 + 1) * 10) / 10,
                costSavings: Math.floor(Math.random() * 2000) + 500
            }
        };
        res.json({
            success: true,
            data: reportData
        });
    }
    catch (error) {
        console.error('Error in getInventoryReport:', error);
        res.status(500).json({ message: 'Error fetching inventory report' });
    }
};
exports.getInventoryReport = getInventoryReport;
//# sourceMappingURL=branchDashboardController.js.map