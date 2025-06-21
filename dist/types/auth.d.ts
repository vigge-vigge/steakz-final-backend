import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { JwtPayload as JwtPayloadBase } from 'jsonwebtoken';
import { ParamsDictionary } from 'express-serve-static-core';
export interface JwtPayload extends JwtPayloadBase {
    userId: number;
    role: Role;
    branchId?: number;
}
export interface AuthenticatedUser {
    id: number;
    role: Role;
    branchId?: number;
}
export type AuthRequest<P = ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = any> = Request<P, ResBody, ReqBody, ReqQuery> & {
    user: AuthenticatedUser;
};
export type AuthRequestHandler<P = ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = any> = (req: AuthRequest<P, ResBody, ReqBody, ReqQuery>, res: Response, next: NextFunction) => Promise<void> | void;
export interface SignupRequest {
    username: string;
    password: string;
    email: string;
    role?: Role;
}
export interface LoginRequest {
    username: string;
    password: string;
}
export interface UserUpdateRequest {
    username?: string;
    email?: string;
    password?: string;
    role?: Role;
    branchId?: number;
}
export interface AuthResponse {
    token: string;
    user: {
        id: number;
        username: string;
        email: string;
        role: Role;
        branchId?: number;
    };
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        pages: number;
        current: number;
        perPage: number;
    };
}
