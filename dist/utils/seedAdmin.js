"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdminUser = void 0;
const client_1 = require("@prisma/client");
const hash_1 = require("./hash");
const prisma = new client_1.PrismaClient();
const seedAdminUser = async () => {
    try {
        const adminExists = await prisma.user.findUnique({
            where: { username: 'admin' },
        });
        if (!adminExists) {
            const adminPassword = await (0, hash_1.hashPassword)('admin123');
            await prisma.user.create({
                data: {
                    username: 'admin',
                    email: 'admin@restaurant.com',
                    password: adminPassword,
                    role: 'ADMIN',
                },
            });
            console.log('✅ Admin user created');
        }
        else {
            console.log('ℹ️ Admin user already exists');
        }
        const gmExists = await prisma.user.findUnique({
            where: { username: 'gm' },
        });
        if (!gmExists) {
            const gmPassword = await (0, hash_1.hashPassword)('gm123');
            await prisma.user.create({
                data: {
                    username: 'gm',
                    email: 'gm@restaurant.com',
                    password: gmPassword,
                    role: 'GENERAL_MANAGER',
                },
            });
            console.log('✅ General Manager user created');
        }
        const mainBranchExists = await prisma.branch.findFirst({
            where: { name: 'Main Branch' },
        });
        if (!mainBranchExists) {
            const bmPassword = await (0, hash_1.hashPassword)('bm123');
            const branchManager = await prisma.user.create({
                data: {
                    username: 'bm',
                    email: 'bm@restaurant.com',
                    password: bmPassword,
                    role: 'BRANCH_MANAGER',
                },
            });
            await prisma.branch.create({
                data: {
                    name: 'Main Branch',
                    address: '123 Main St, City',
                    phone: '555-0123',
                    managerId: branchManager.id,
                },
            });
            console.log('✅ Sample branch and branch manager created');
        }
    }
    catch (error) {
        console.error('Error seeding initial data:', error);
        return;
    }
};
exports.seedAdminUser = seedAdminUser;
//# sourceMappingURL=seedAdmin.js.map