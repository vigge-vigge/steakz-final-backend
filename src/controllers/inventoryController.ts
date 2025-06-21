import { Request, Response } from 'express';
import { handleError } from '../utils/errorHandler';
import prisma from '../utils/prisma';

// Get inventory for a branch
export const getInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;
    const user = req.user!;

    console.log('getInventory called by user:', { id: user.id, role: user.role, branchId: user.branchId });
    console.log('Query branchId:', branchId);

    // For CHEF role, use their assigned branchId if no branchId provided
    let targetBranchId: number | undefined;
    
    if (branchId) {
      targetBranchId = Number(branchId);
    } else if (user.role === 'CHEF' && user.branchId) {
      targetBranchId = user.branchId;
    }

    // Authorization check - CHEF can only access their own branch
    if (user.role === 'CHEF' && user.branchId && targetBranchId && targetBranchId !== user.branchId) {
      res.status(403).json({ message: 'Unauthorized to view this branch inventory' });
      return;
    }

    // CASHIER authorization check
    if (user.role === 'CASHIER') {
      if (!user.branchId || (targetBranchId && targetBranchId !== user.branchId)) {
        res.status(403).json({ message: 'Unauthorized to view this branch inventory' });
        return;
      }
      targetBranchId = user.branchId;
    }

    // Get inventory items
    let inventory;
    if (targetBranchId) {
      inventory = await prisma.inventoryItem.findMany({
        where: { branchId: targetBranchId },
        orderBy: { name: 'asc' }
      });
    } else {
      // Admin, managers can view all branches
      if (user.role === 'ADMIN' || user.role === 'GENERAL_MANAGER') {
        inventory = await prisma.inventoryItem.findMany({
          orderBy: { name: 'asc' }
        });
      } else {
        res.status(400).json({ message: 'Branch ID is required' });
        return;
      }
    }

    console.log('Returning inventory items:', inventory.length);
    res.json(inventory);
  } catch (error) {
    console.error('Error in getInventory:', error);
    handleError(error, res);
  }
};

// Update inventory item
export const updateInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { quantity, minThreshold } = req.body;
    const user = req.user!;

    // Get inventory item to check branch
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: Number(id) }
    });

    if (!inventoryItem) {
      res.status(404).json({ message: 'Inventory item not found' });
      return;
    }

    // Authorization check
    if (user.role === 'CHEF' || user.role === 'CASHIER') {
      if (!user.branchId || inventoryItem.branchId !== user.branchId) {
        res.status(403).json({ message: 'Unauthorized to update this inventory item' });
        return;
      }
    }

    const updateData: any = {};
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    if (minThreshold !== undefined) updateData.minThreshold = Number(minThreshold);

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: Number(id) },
      data: updateData
    });

    res.json({
      message: 'Inventory item updated successfully',
      item: updatedItem
    });
  } catch (error) {
    console.error('Error in updateInventoryItem:', error);
    handleError(error, res);
  }
};

// Create inventory item (for branch managers and above)
export const createInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, quantity, unit, minThreshold, branchId } = req.body;
    const user = req.user!;

    // Authorization check
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

    const inventoryItem = await prisma.inventoryItem.create({
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
  } catch (error) {
    console.error('Error in createInventoryItem:', error);
    handleError(error, res);
  }
};

// Delete inventory item (for branch managers and above)
export const deleteInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Get inventory item to check branch
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: Number(id) }
    });

    if (!inventoryItem) {
      res.status(404).json({ message: 'Inventory item not found' });
      return;
    }

    // Authorization check
    if (!['ADMIN', 'GENERAL_MANAGER', 'BRANCH_MANAGER'].includes(user.role)) {
      res.status(403).json({ message: 'Unauthorized to delete inventory items' });
      return;
    }

    if (user.role === 'BRANCH_MANAGER' && user.branchId !== inventoryItem.branchId) {
      res.status(403).json({ message: 'Can only delete inventory from your branch' });
      return;
    }

    await prisma.inventoryItem.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Error in deleteInventoryItem:', error);
    handleError(error, res);
  }
};
