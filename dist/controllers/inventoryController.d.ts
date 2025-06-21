import { Request, Response } from 'express';
export declare const getInventory: (req: Request, res: Response) => Promise<void>;
export declare const updateInventoryItem: (req: Request, res: Response) => Promise<void>;
export declare const createInventoryItem: (req: Request, res: Response) => Promise<void>;
export declare const deleteInventoryItem: (req: Request, res: Response) => Promise<void>;
