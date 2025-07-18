import { Request, Response } from 'express';
export declare const getBranchDashboard: (req: Request, res: Response) => Promise<void>;
export declare const getBranchMetrics: (req: Request, res: Response) => Promise<void>;
export declare const getDailySales: (req: Request, res: Response) => Promise<void>;
export declare const getActiveOrders: (req: Request, res: Response) => Promise<void>;
export declare const getStaffOnShift: (req: Request, res: Response) => Promise<void>;
export declare const getInventoryAlerts: (req: Request, res: Response) => Promise<void>;
export declare const getCustomerFeedback: (_req: Request, res: Response) => Promise<void>;
export declare const getWeeklyTrend: (req: Request, res: Response) => Promise<void>;
export declare const getBranchMetricsSimple: (req: Request, res: Response) => Promise<void>;
export declare const getSalesReport: (req: Request, res: Response) => Promise<void>;
export declare const getStaffPerformance: (req: Request, res: Response) => Promise<void>;
export declare const getOrderAnalytics: (req: Request, res: Response) => Promise<void>;
export declare const exportBranchReport: (req: Request, res: Response) => Promise<void>;
export declare const getFeedbackStats: (_req: Request, res: Response) => Promise<void>;
export declare const getInventoryReport: (req: Request, res: Response) => Promise<void>;
