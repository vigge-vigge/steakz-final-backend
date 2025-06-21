import { Request, Response } from 'express';
export declare const signup: (req: Request, res: Response) => Promise<any>;
export declare const login: (req: Request, res: Response) => Promise<any>;
export declare const requestPasswordReset: (req: Request, res: Response) => Promise<void>;
export declare const resetPassword: (req: Request, res: Response) => Promise<void>;
