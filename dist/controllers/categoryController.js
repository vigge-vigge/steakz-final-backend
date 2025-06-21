"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderCategories = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategories = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getCategories = async (_req, res) => {
    const categories = await prisma_1.default.menuCategory.findMany({ orderBy: { order: 'asc' } });
    res.json(categories);
};
exports.getCategories = getCategories;
const createCategory = async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) {
        res.status(400).json({ message: 'Name required' });
        return;
    }
    const category = await prisma_1.default.menuCategory.create({ data: { name: name.trim() } });
    res.status(201).json(category);
};
exports.createCategory = createCategory;
const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, order } = req.body;
    const category = await prisma_1.default.menuCategory.update({
        where: { id: Number(id) },
        data: { name, order },
    });
    res.json(category);
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res) => {
    const { id } = req.params;
    await prisma_1.default.menuCategory.delete({ where: { id: Number(id) } });
    res.json({ message: 'Category deleted' });
};
exports.deleteCategory = deleteCategory;
const reorderCategories = async (req, res) => {
    const { order } = req.body;
    for (const { id, order: ord } of order) {
        await prisma_1.default.menuCategory.update({ where: { id }, data: { order: ord } });
    }
    res.json({ message: 'Reordered' });
};
exports.reorderCategories = reorderCategories;
//# sourceMappingURL=categoryController.js.map