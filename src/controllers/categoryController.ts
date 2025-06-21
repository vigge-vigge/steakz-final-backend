import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getCategories = async (_req: Request, res: Response) => {
  const categories = await prisma.menuCategory.findMany({ orderBy: { order: 'asc' } });
  res.json(categories);
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ message: 'Name required' });
    return;
  }
  const category = await prisma.menuCategory.create({ data: { name: name.trim() } });
  res.status(201).json(category);
};

export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, order } = req.body;
  const category = await prisma.menuCategory.update({
    where: { id: Number(id) },
    data: { name, order },
  });
  res.json(category);
};

export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.menuCategory.delete({ where: { id: Number(id) } });
  res.json({ message: 'Category deleted' });
};

export const reorderCategories = async (req: Request, res: Response) => {
  const { order } = req.body; // [{id, order}]
  for (const { id, order: ord } of order) {
    await prisma.menuCategory.update({ where: { id }, data: { order: ord } });
  }
  res.json({ message: 'Reordered' });
};
