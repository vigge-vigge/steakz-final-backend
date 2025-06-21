import { Request, Response } from 'express';
export declare const processPayment: (req: Request, res: Response) => Promise<void>;
export declare const getPayment: (req: Request, res: Response) => Promise<void>;
export declare const reprintReceipt: (req: Request, res: Response) => Promise<void>;
export declare const emailReceipt: (req: Request, res: Response) => Promise<void>;
