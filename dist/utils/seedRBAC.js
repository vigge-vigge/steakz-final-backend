"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require('bcryptjs');
const prisma = new client_1.PrismaClient();
async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}
async function main() {
    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@restaurant.com',
            password: await hashPassword('admin123'),
            role: 'ADMIN',
        },
    });
    await prisma.user.upsert({
        where: { username: 'hqmanager' },
        update: {},
        create: {
            username: 'hqmanager',
            email: 'hq@restaurant.com',
            password: await hashPassword('hq12345!'),
            role: 'GENERAL_MANAGER',
        },
    });
    const branchManager = await prisma.user.upsert({
        where: { username: 'branchmgr' },
        update: {},
        create: {
            username: 'branchmgr',
            email: 'branch@restaurant.com',
            password: await hashPassword('branch123!'),
            role: 'BRANCH_MANAGER',
        },
    });
    let branch = await prisma.branch.findFirst({ where: { name: 'Central' } });
    if (!branch) {
        branch = await prisma.branch.create({
            data: {
                name: 'Central',
                address: '123 Main St',
                phone: '555-0001',
                manager: { connect: { id: branchManager.id } },
            },
        });
    }
    await prisma.user.update({
        where: { id: branchManager.id },
        data: { branchId: branch.id },
    });
    await prisma.user.upsert({
        where: { username: 'chef1' },
        update: {},
        create: {
            username: 'chef1',
            email: 'chef1@restaurant.com',
            password: await hashPassword('chef123!'),
            role: 'CHEF',
            branchId: branch.id,
        },
    });
    await prisma.user.upsert({
        where: { username: 'cashier1' },
        update: {},
        create: {
            username: 'cashier1',
            email: 'cashier1@restaurant.com',
            password: await hashPassword('cashier123!'),
            role: 'CASHIER',
            branchId: branch.id,
        },
    });
    await prisma.user.upsert({
        where: { username: 'customer1' },
        update: {},
        create: {
            username: 'customer1',
            email: 'customer1@restaurant.com',
            password: await hashPassword('customer123!'),
            role: 'CUSTOMER',
        },
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=seedRBAC.js.map