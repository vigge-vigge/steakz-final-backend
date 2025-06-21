// This file is generated as part of the full-stack RBAC system scaffold for the restaurant management system.
// See the main answer for details on how to use and extend this seed script.

import { PrismaClient } from '@prisma/client';

// Use require for bcryptjs to avoid import error in Node.js
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

async function main() {
  // Create admin user
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

  // Create general manager
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

  // Create branch manager
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

  // Check if branch exists by name
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

  // Update branch manager to assign branchId
  await prisma.user.update({
    where: { id: branchManager.id },
    data: { branchId: branch.id },
  });

  // Create chef
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

  // Create cashier
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

  // Create customer
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
