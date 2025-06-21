import { Request, Response } from 'express';
export declare function startExport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getExportStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function downloadExportFile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
