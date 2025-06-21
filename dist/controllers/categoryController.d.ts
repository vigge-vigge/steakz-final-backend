import { Request, Response } from 'express';
export declare const getCategories: (_req: Request, res: Response) => Promise<void>;
export declare const createCategory: (req: Request, res: Response) => Promise<void>;
export declare const updateCategory: (req: Request, res: Response) => Promise<void>;
export declare const deleteCategory: (req: Request, res: Response) => Promise<void>;
export declare const reorderCategories: (req: Request, res: Response) => Promise<void>;
