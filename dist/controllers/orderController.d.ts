import { Request, Response } from 'express';
export declare const getOrders: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateOrderStatus: (req: Request, res: Response) => Promise<void>;
export declare const deleteOrder: (req: Request, res: Response) => Promise<void>;
