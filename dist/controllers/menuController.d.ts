import { Request, Response } from 'express';
export declare const getMenuItems: (req: Request, res: Response) => Promise<void>;
export declare const createMenuItem: (req: Request, res: Response) => Promise<void>;
export declare const updateMenuItem: (req: Request, res: Response) => Promise<void>;
export declare const deleteMenuItem: (req: Request, res: Response) => Promise<void>;
