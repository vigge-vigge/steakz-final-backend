import { Request, Response } from 'express';
export declare const createReceipt: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getReceipts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getReceiptById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getReceiptStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
