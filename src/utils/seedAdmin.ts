import { PrismaClient } from '@prisma/client'
import { hashPassword } from './hash';

const prisma = new PrismaClient()

export const seedAdminUser = async () => {
  try {
    // Create admin if not exists
    const adminExists = await prisma.user.findUnique({
      where: { username: 'admin' },
    });

    if (!adminExists) {
      const adminPassword = await hashPassword('admin123');
      await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@restaurant.com',
          password: adminPassword,
          role: 'ADMIN',
        },
      });
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    // Create general manager if not exists
    const gmExists = await prisma.user.findUnique({
      where: { username: 'gm' },
    });

    if (!gmExists) {
      const gmPassword = await hashPassword('gm123');
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

    // Create a sample branch with manager
    const mainBranchExists = await prisma.branch.findFirst({
      where: { name: 'Main Branch' },
    });

    if (!mainBranchExists) {
      // Create branch manager
      const bmPassword = await hashPassword('bm123');
      const branchManager = await prisma.user.create({
        data: {
          username: 'bm',
          email: 'bm@restaurant.com',
          password: bmPassword,
          role: 'BRANCH_MANAGER',
        },
      });

      // Create the branch
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

  } catch (error) {
    console.error('Error seeding initial data:', error);
    return;
  }
};
