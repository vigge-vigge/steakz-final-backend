"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const staffRoutes_1 = __importDefault(require("./routes/staffRoutes"));
const branchRoutes_1 = __importDefault(require("./routes/branchRoutes"));
const branchDashboardRoutes_1 = __importDefault(require("./routes/branchDashboardRoutes"));
const menuRoutes_1 = __importDefault(require("./routes/menuRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const dataExportRoutes_1 = __importDefault(require("./routes/dataExportRoutes"));
const inventoryRoutes_1 = __importDefault(require("./routes/inventoryRoutes"));
const adminDashboardRoutes_1 = __importDefault(require("./routes/adminDashboardRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const receipts_1 = __importDefault(require("./routes/receipts"));
const postRoutes_1 = __importDefault(require("./routes/postRoutes"));
const commentRoutes_1 = __importDefault(require("./routes/commentRoutes"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const seedAdmin_1 = require("./utils/seedAdmin");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/', (_req, res) => {
    res.send('Welcome to the Restaurant Management API!');
});
app.use('/api/users', userRoutes_1.default);
app.use('/auth', authRoutes_1.default);
app.use('/api/staff', staffRoutes_1.default);
app.use('/api/branches', branchRoutes_1.default);
app.use('/api/branch-dashboard', branchDashboardRoutes_1.default);
app.use('/api/menu', menuRoutes_1.default);
app.use('/api/menu-items', menuRoutes_1.default);
app.use('/api/inventory', inventoryRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/data-export', dataExportRoutes_1.default);
app.use('/api/admin-dashboard', adminDashboardRoutes_1.default);
app.use('/api/categories', categoryRoutes_1.default);
app.use('/api/receipts', receipts_1.default);
app.use('/api/posts', postRoutes_1.default);
app.use('/api/comments', commentRoutes_1.default);
app.listen(port, async () => {
    console.log(`🚀 Restaurant Management API Server running on http://localhost:${port}`);
    console.log('📋 Available endpoints:');
    console.log('   - Authentication: /auth/*');
    console.log('   - Users: /api/users/*');
    console.log('   - Staff Management: /api/staff/*');
    console.log('   - Branch Operations: /api/branches/*');
    console.log('   - Branch Dashboard: /api/branch-dashboard/*');
    console.log('   - Menu Management: /api/menu/*');
    console.log('   - Orders: /api/orders/*');
    console.log('   - Payments: /api/payments/*');
    console.log('   - Inventory: /api/inventory/*');
    console.log('   - Admin Dashboard: /api/admin-dashboard/*');
    console.log('   - Reviews/Posts: /api/posts/*');
    console.log('   - Data Export: /api/data-export/*');
    try {
        await (0, seedAdmin_1.seedAdminUser)();
        console.log('✅ Admin user seeding completed');
    }
    catch (error) {
        console.error('❌ Error seeding admin user:', error);
    }
});
//# sourceMappingURL=index.js.map