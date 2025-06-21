import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                role: Role;
                branchId?: number;
            };
        }
    }
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => void;
export declare const authorizeRole: (roles: Role[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare function authorizeRoles(roles: string[]): (req: any, res: Response, next: NextFunction) => void;
export declare const authorizeBranchAccess: () => (req: Request, res: Response, next: NextFunction) => void;
