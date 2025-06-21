"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMenuItem = exports.updateMenuItem = exports.createMenuItem = exports.getMenuItems = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getMenuItems = async (req, res) => {
    try {
        const { branchId } = req.query;
        const menuItems = await prisma_1.default.menuItem.findMany({
            where: branchId ? {
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
            orderBy: { name: 'asc' }
        });
        res.json(menuItems);
    }
    catch (error) {
        console.error('Error in getMenuItems:', error);
        res.status(500).json({ message: 'Error fetching menu items' });
    }
};
exports.getMenuItems = getMenuItems;
const createMenuItem = async (req, res) => {
    try {
        const { name, description, price, category, ingredients } = req.body;
        if (!name?.trim() || !description?.trim() || !price || !category?.trim()) {
            res.status(400).json({ message: 'All fields are required' });
            return;
        }
        const menuItem = await prisma_1.default.menuItem.create({
            data: {
                name: name.trim(),
                description: description.trim(),
                price: parseFloat(price),
                category: category.trim(),
                branch: { connect: { id: 1 } },
                ingredients: {
                    connect: ingredients.map((id) => ({ id }))
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
    }
    catch (error) {
        console.error('Error in createMenuItem:', error);
        res.status(500).json({ message: 'Error creating menu item' });
    }
};
exports.createMenuItem = createMenuItem;
const updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, category, isAvailable, ingredients } = req.body;
        const updateData = {};
        if (name?.trim())
            updateData.name = name.trim();
        if (description?.trim())
            updateData.description = description.trim();
        if (price)
            updateData.price = parseFloat(price);
        if (category?.trim())
            updateData.category = category.trim();
        if (typeof isAvailable === 'boolean')
            updateData.isAvailable = isAvailable;
        if (ingredients?.length >= 0) {
            updateData.ingredients = {
                set: [],
                connect: ingredients.map((id) => ({ id }))
            };
        }
        const menuItem = await prisma_1.default.menuItem.update({
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
    }
    catch (error) {
        console.error('Error in updateMenuItem:', error);
        res.status(500).json({ message: 'Error updating menu item' });
    }
};
exports.updateMenuItem = updateMenuItem;
const deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.default.menuItem.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Menu item deleted successfully' });
    }
    catch (error) {
        console.error('Error in deleteMenuItem:', error);
        res.status(500).json({ message: 'Error deleting menu item' });
    }
};
exports.deleteMenuItem = deleteMenuItem;
//# sourceMappingURL=menuController.js.map