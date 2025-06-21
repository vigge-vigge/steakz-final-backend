/**
 * Menu Management Controller
 * 
 * This module handles all menu-related operations for the restaurant management system.
 * It provides comprehensive menu management with ingredient tracking, availability control,
 * and branch-specific filtering capabilities.
 * 
 * Features:
 * - Menu item CRUD operations
 * - Ingredient relationship management
 * - Branch-specific menu filtering
 * - Availability control
 * - Category-based organization
 * - Price management
 * - Search and filtering capabilities
 * 
 * Business Logic:
 * - Menu items can have multiple ingredients
 * - Availability can be controlled per item
 * - Prices are stored with decimal precision
 * - Categories help organize menu items
 * - Branch filtering for location-specific menus
 */

import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * Get Menu Items with Optional Branch Filtering
 * 
 * Retrieves menu items with their associated ingredients. Can be filtered
 * by branch to show only items available at specific locations.
 * 
 * Features:
 * - Optional branch-based filtering
 * - Ingredient information included
 * - Alphabetical sorting by name
 * - Comprehensive ingredient details
 * 
 * Query Parameters:
 * - branchId (optional): Filter items by branch availability
 * 
 * @param req - Request with optional branchId query parameter
 * @param res - Response with menu items and ingredient details
 */
export const getMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;
    
    // Build query with optional branch filtering
    const menuItems = await prisma.menuItem.findMany({
      where: branchId ? {
        // Filter by branch availability through ingredient relationships
        ingredients: {
          some: {
            branchId: Number(branchId)
          }
        }
      } : undefined,
      include: {
        ingredients: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unit: true,
          }
        }
      },
      orderBy: { name: 'asc' } // Sort alphabetically for easy browsing
    });

    res.json(menuItems);
  } catch (error) {
    console.error('Error in getMenuItems:', error);
    res.status(500).json({ message: 'Error fetching menu items' });
  }
};

/**
 * Create New Menu Item
 * 
 * Creates a new menu item with ingredient associations and comprehensive validation.
 * 
 * Features:
 * - Input validation for all required fields
 * - Ingredient relationship establishment
 * - Price validation and formatting
 * - Category assignment
 * - Automatic availability setting
 * 
 * @param req - Request with menu item data and ingredient associations
 * @param res - Response with created menu item or error
 */
export const createMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, price, category, ingredients } = req.body;

    // Comprehensive input validation
    if (!name?.trim() || !description?.trim() || !price || !category?.trim()) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    // Create menu item with ingredient connections
    const menuItem = await prisma.menuItem.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category: category.trim(),
        branch: { connect: { id: 1 } }, // TEMP: always assign to branch 1 for now
        ingredients: {
          connect: ingredients.map((id: number) => ({ id }))
        }
      },
      include: {
        ingredients: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unit: true,
          }
        }
      }
    });

    res.status(201).json({
      message: 'Menu item created successfully',
      menuItem
    });
  } catch (error) {
    console.error('Error in createMenuItem:', error);
    res.status(500).json({ message: 'Error creating menu item' });
  }
};

// Update menu item
export const updateMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, price, category, isAvailable, ingredients } = req.body;

    // Prepare update data
    const updateData: any = {};
    
    if (name?.trim()) updateData.name = name.trim();
    if (description?.trim()) updateData.description = description.trim();
    if (price) updateData.price = parseFloat(price);
    if (category?.trim()) updateData.category = category.trim();
    if (typeof isAvailable === 'boolean') updateData.isAvailable = isAvailable;
    
    if (ingredients?.length >= 0) {
      updateData.ingredients = {
        set: [], // Clear existing connections
        connect: ingredients.map((id: number) => ({ id })) // Add new connections
      };
    }

    const menuItem = await prisma.menuItem.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        ingredients: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unit: true,
          }
        }
      }
    });

    res.json({
      message: 'Menu item updated successfully',
      menuItem
    });
  } catch (error) {
    console.error('Error in updateMenuItem:', error);
    res.status(500).json({ message: 'Error updating menu item' });
  }
};

// Delete menu item
export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.menuItem.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error in deleteMenuItem:', error);
    res.status(500).json({ message: 'Error deleting menu item' });
  }
};
