"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../utils/prisma"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get('/public', async (_req, res) => {
    try {
        const branches = await prisma_1.default.branch.findMany({
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
        const data = branches.map(b => ({ ...b, status: 'active' }));
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error while fetching branches' });
    }
});
router.get('/my', authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRole)(['BRANCH_MANAGER']), (req, res, next) => {
    (async () => {
        try {
            const user = req.user;
            if (!user.branchId) {
                return res.status(400).json({ error: 'Branch manager must be assigned to a branch' });
            }
            const branch = await prisma_1.default.branch.findUnique({
                where: { id: user.branchId },
                include: {
                    manager: { select: { id: true, username: true } },
                    staff: { select: { id: true } },
                },
            });
            if (!branch) {
                return res.status(404).json({ error: 'Branch not found' });
            }
            const data = { ...branch, status: 'active' };
            return res.json([data]);
        }
        catch (error) {
            console.error('Error fetching branch manager\'s branch:', error);
            return res.status(500).json({ error: 'Server error while fetching branch' });
        }
    })().catch(next);
});
router.get('/', authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRole)(['ADMIN', 'GENERAL_MANAGER', 'CUSTOMER']), async (_req, res) => {
    try {
        const branches = await prisma_1.default.branch.findMany({
            include: {
                manager: { select: { id: true, username: true } },
                staff: { select: { id: true } },
            },
            orderBy: { name: 'asc' },
        });
        const data = branches.map(b => ({ ...b, status: 'active' }));
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error while fetching branches' });
    }
});
router.post('/', authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorizeRole)(['ADMIN', 'GENERAL_MANAGER']), (req, res, next) => {
    (async () => {
        try {
            const { name, address, phone, managerId } = req.body;
            if (!name) {
                return res.status(400).json({ error: 'Name is required' });
            }
            const branch = await prisma_1.default.branch.create({
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
        }
        catch (error) {
            console.error('Error creating branch:', error);
            return res.status(500).json({ error: 'Server error while creating branch' });
        }
    })().catch(next);
});
router.post('/closest', (req, res, next) => {
    (async () => {
        try {
            const { address } = req.body;
            if (!address || typeof address !== 'string') {
                return res.status(400).json({ error: 'Address is required' });
            }
            const branches = await prisma_1.default.branch.findMany();
            if (!branches.length) {
                return res.status(404).json({ error: 'No branches found' });
            }
            const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
            const input = normalize(address);
            let best = branches[0];
            let bestScore = 0;
            for (const branch of branches) {
                const branchNorm = normalize(branch.address || '');
                let score = 0;
                for (let i = 0; i < Math.min(branchNorm.length, input.length); i++) {
                    if (branchNorm[i] === input[i])
                        score++;
                }
                if (score > bestScore) {
                    best = branch;
                    bestScore = score;
                }
            }
            return res.json({ id: best.id, name: best.name, address: best.address });
        }
        catch (error) {
            return res.status(500).json({ error: 'Failed to find closest branch' });
        }
    })().catch(next);
});
exports.default = router;
//# sourceMappingURL=branchRoutes.js.map