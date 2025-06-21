"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteInventoryItem = exports.createInventoryItem = exports.updateInventoryItem = exports.getInventory = void 0;
const errorHandler_1 = require("../utils/errorHandler");
const prisma_1 = __importDefault(require("../utils/prisma"));
const getInventory = async (req, res) => {
    try {
        const { branchId } = req.query;
        const user = req.user;
        console.log('getInventory called by user:', { id: user.id, role: user.role, branchId: user.branchId });
        console.log('Query branchId:', branchId);
        let targetBranchId;
        if (branchId) {
            targetBranchId = Number(branchId);
        }
        else if (user.role === 'CHEF' && user.branchId) {
            targetBranchId = user.branchId;
        }
        if (user.role === 'CHEF' && user.branchId && targetBranchId && targetBranchId !== user.branchId) {
            res.status(403).json({ message: 'Unauthorized to view this branch inventory' });
            return;
        }
        if (user.role === 'CASHIER') {
            if (!user.branchId || (targetBranchId && targetBranchId !== user.branchId)) {
                res.status(403).json({ message: 'Unauthorized to view this branch inventory' });
                return;
            }
            targetBranchId = user.branchId;
        }
        let inventory;
        if (targetBranchId) {
            inventory = await prisma_1.default.inventoryItem.findMany({
                where: { branchId: targetBranchId },
                orderBy: { name: 'asc' }
            });
        }
        else {
            if (user.role === 'ADMIN' || user.role === 'GENERAL_MANAGER') {
                inventory = await prisma_1.default.inventoryItem.findMany({
                    orderBy: { name: 'asc' }
                });
            }
            else {
                res.status(400).json({ message: 'Branch ID is required' });
                return;
            }
        }
        console.log('Returning inventory items:', inventory.length);
        res.json(inventory);
    }
    catch (error) {
        console.error('Error in getInventory:', error);
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.getInventory = getInventory;
const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, minThreshold } = req.body;
        const user = req.user;
        const inventoryItem = await prisma_1.default.inventoryItem.findUnique({
            where: { id: Number(id) }
        });
        if (!inventoryItem) {
            res.status(404).json({ message: 'Inventory item not found' });
            return;
        }
        if (user.role === 'CHEF' || user.role === 'CASHIER') {
            if (!user.branchId || inventoryItem.branchId !== user.branchId) {
                res.status(403).json({ message: 'Unauthorized to update this inventory item' });
                return;
            }
        }
        const updateData = {};
        if (quantity !== undefined)
            updateData.quantity = Number(quantity);
        if (minThreshold !== undefined)
            updateData.minThreshold = Number(minThreshold);
        const updatedItem = await prisma_1.default.inventoryItem.update({
            where: { id: Number(id) },
            data: updateData
        });
        res.json({
            message: 'Inventory item updated successfully',
            item: updatedItem
        });
    }
    catch (error) {
        console.error('Error in updateInventoryItem:', error);
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.updateInventoryItem = updateInventoryItem;
const createInventoryItem = async (req, res) => {
    try {
        const { name, quantity, unit, minThreshold, branchId } = req.body;
        const user = req.user;
        if (!['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER'].includes(user.role)) {
            res.status(403).json({ message: 'Unauthorized to create inventory items' });
            return;
        }
        if (user.role === 'BRANCH_MANAGER' && user.branchId !== Number(branchId)) {
            res.status(403).json({ message: 'Can only create inventory for your branch' });
            return;
        }
        if (!name || !unit || quantity === undefined || minThreshold === undefined || !branchId) {
            res.status(400).json({ message: 'All fields are required' });
            return;
        }
        const inventoryItem = await prisma_1.default.inventoryItem.create({
            data: {
                name: name.trim(),
                quantity: Number(quantity),
                unit: unit.trim(),
                minThreshold: Number(minThreshold),
                branchId: Number(branchId)
            }
        });
        res.status(201).json({
            message: 'Inventory item created successfully',
            item: inventoryItem
        });
    }
    catch (error) {
        console.error('Error in createInventoryItem:', error);
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.createInventoryItem = createInventoryItem;
const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const inventoryItem = await prisma_1.default.inventoryItem.findUnique({
            where: { id: Number(id) }
        });
        if (!inventoryItem) {
            res.status(404).json({ message: 'Inventory item not found' });
            return;
        }
        if (!['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER'].includes(user.role)) {
            res.status(403).json({ message: 'Unauthorized to delete inventory items' });
            return;
        }
        if (user.role === 'BRANCH_MANAGER' && user.branchId !== inventoryItem.branchId) {
            res.status(403).json({ message: 'Can only delete inventory from your branch' });
            return;
        }
        await prisma_1.default.inventoryItem.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Inventory item deleted successfully' });
    }
    catch (error) {
        console.error('Error in deleteInventoryItem:', error);
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.deleteInventoryItem = deleteInventoryItem;
//# sourceMappingURL=inventoryController.js.map