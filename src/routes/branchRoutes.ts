import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// GET /api/branches/public - fetch all branches for public viewing (no auth required)
router.get('/public', async (_req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
    // Add a status field for demo (all active)
    const data = branches.map(b => ({ ...b, status: 'active' }));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching branches' });
  }
});

// GET /api/branches/my - fetch only the branch assigned to the logged-in branch manager
router.get('/my', authenticateToken, authorizeRole(['BRANCH_MANAGER']), (req, res, next) => {
  (async () => {
    try {
      const user = req.user!;
      
      if (!user.branchId) {
        return res.status(400).json({ error: 'Branch manager must be assigned to a branch' });
      }

      const branch = await prisma.branch.findUnique({
        where: { id: user.branchId },
        include: {
          manager: { select: { id: true, username: true } },
          staff: { select: { id: true } },
        },
      });

      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      // Return as an array to match the expected format
      const data = { ...branch, status: 'active' };
      return res.json([data]);
    } catch (error) {
      console.error('Error fetching branch manager\'s branch:', error);
      return res.status(500).json({ error: 'Server error while fetching branch' });
    }
  })().catch(next);
});

// GET /api/branches - fetch all branches with manager and staff count (auth required)
router.get('/', authenticateToken, authorizeRole(['ADMIN', 'GENERAL_MANAGER', 'CUSTOMER']), async (_req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        manager: { select: { id: true, username: true } },
        staff: { select: { id: true } },
      },
      orderBy: { name: 'asc' },
    });
    // Add a status field for demo (all active)
    const data = branches.map(b => ({ ...b, status: 'active' }));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching branches' });
  }
});

// POST /api/branches - create a new branch
router.post('/', authenticateToken, authorizeRole(['ADMIN', 'GENERAL_MANAGER']), (req, res, next) => {
  (async () => {
    try {
      const { name, address, phone, managerId } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }
      // Optional: address/phone/managerId can be empty
      const branch = await prisma.branch.create({
        data: {
          name,
          address: address || '',
          phone: phone || '',
          managerId: managerId ? Number(managerId) : undefined,
        },
        include: {
          manager: { select: { id: true, username: true } },
          staff: { select: { id: true } },
        },
      });
      return res.status(201).json(branch);
    } catch (error) {
      console.error('Error creating branch:', error);
      return res.status(500).json({ error: 'Server error while creating branch' });
    }
  })().catch(next);
});

// POST /api/branches/closest - find the closest branch by address
router.post('/closest', (req, res, next) => {
  (async () => {
    try {
      const { address } = req.body;
      if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: 'Address is required' });
      }
      // Fetch all branches
      const branches = await prisma.branch.findMany();
      if (!branches.length) {
        return res.status(404).json({ error: 'No branches found' });
      }
      // Simple string similarity for demo; replace with geocoding in production
      const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
      const input = normalize(address);
      let best = branches[0];
      let bestScore = 0;
      for (const branch of branches) {
        const branchNorm = normalize(branch.address || '');
        // Count matching characters from start
        let score = 0;
        for (let i = 0; i < Math.min(branchNorm.length, input.length); i++) {
          if (branchNorm[i] === input[i]) score++;
        }
        if (score > bestScore) {
          best = branch;
          bestScore = score;
        }
      }
      return res.json({ id: best.id, name: best.name, address: best.address });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to find closest branch' });
    }
  })().catch(next);
});

export default router;
