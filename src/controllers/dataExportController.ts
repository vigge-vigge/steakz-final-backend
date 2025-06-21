import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Parser } from 'json2csv';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const exportJobs: Record<string, { status: string; progress: number; filePath?: string; error?: string }> = {};

export async function startExport(req: Request, res: Response) {
  try {
    const { dataTypes, dateRange, customFields } = req.body;
    const jobId = uuidv4();
    exportJobs[jobId] = { status: 'processing', progress: 0 };
    // Start async export job
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    process.nextTick(() => processExportJob(jobId, req.user!.id, dataTypes, dateRange, customFields));
    return res.json({ jobId });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to start export' });
  }
}

export async function getExportStatus(req: Request, res: Response) {
  const { jobId } = req.params;
  const job = exportJobs[jobId];
  if (!job) return res.status(404).json({ status: 'not_found' });
  return res.json({ status: job.status, progress: job.progress });
}

export async function downloadExportFile(req: Request, res: Response) {
  const { jobId } = req.params;
  const job = exportJobs[jobId];
  if (!job || job.status !== 'completed' || !job.filePath) return res.status(404).json({ message: 'File not ready' });
  res.download(job.filePath as string, 'data-export.csv', err => {
    if (!err && job.filePath) fs.unlink(job.filePath, () => {});
  });
  return;
}

async function processExportJob(jobId: string, userId: number, dataTypes: string[], dateRange: any, customFields: string[]) {
  try {
    let allData: any[] = [];
    let headers: string[] = [];
    let progress = 0;
    for (const [i, type] of dataTypes.entries()) {
      let data: any[] = [];
      if (type === 'sales') {
        data = await exportSalesData(dateRange?.start, dateRange?.end, customFields);
        headers = generateCSVHeaders('sales', customFields);
      } else if (type === 'inventory') {
        data = await exportInventoryData(customFields);
        headers = generateCSVHeaders('inventory', customFields);
      } else if (type === 'logs') {
        data = await exportLogsData(dateRange?.start, dateRange?.end, customFields);
        headers = generateCSVHeaders('logs', customFields);
      }
      allData = allData.concat(data);
      progress = Math.round(((i + 1) / dataTypes.length) * 100);
      exportJobs[jobId].progress = progress;
    }
    const parser = new Parser({ fields: headers });
    const csv = parser.parse(allData);
    const filePath = path.join(__dirname, '../../tmp', `${jobId}.csv`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, csv);
    exportJobs[jobId] = { status: 'completed', progress: 100, filePath };
    logExportAttempt(userId, dataTypes, 'success');
    // Automatically import/sync exported data back to DB
    await importExportedData(allData, dataTypes);
  } catch (err: any) {
    exportJobs[jobId] = { status: 'failed', progress: 100, error: err.message };
    logExportAttempt(userId, dataTypes, 'failed');
  }
}

// Import/sync exported data back to the database
async function importExportedData(data: any[], dataTypes: string[]) {
  for (const type of dataTypes) {
    if (type === 'sales') {
      for (const order of data) {
        if (order.id && order.totalAmount) {
          await prisma.order.upsert({
            where: { id: order.id },
            update: { ...order },
            create: { ...order }
          });
        }
      }
    } else if (type === 'inventory') {
      for (const item of data) {
        if (item.id && item.name) {
          await prisma.inventoryItem.upsert({
            where: { id: item.id },
            update: { ...item },
            create: { ...item }
          });
        }
      }
    }
    // logs: no-op for now
  }
}

async function exportSalesData(startDate?: string, endDate?: string, _fields: string[] = []) {
  return await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      },
    },
    select: {
      id: true,
      createdAt: true,
      totalAmount: true,
    },
  });
}

async function exportInventoryData(_fields: string[] = []) {
  return await prisma.inventoryItem.findMany({
    where: { quantity: { gt: 0 } },
    select: {
      id: true,
      name: true,
      quantity: true,
    },
  });
}

async function exportLogsData(_startDate?: string, _endDate?: string, _logTypes: string[] = []) {
  // Fallback: return empty array if no log table
  return [];
}

function generateCSVHeaders(dataType: string, customFields: string[] = []) {
  if (dataType === 'sales') return ['id', 'createdAt', 'totalAmount', ...customFields];
  if (dataType === 'inventory') return ['id', 'name', 'quantity', ...customFields];
  if (dataType === 'logs') return ['id', 'timestamp', 'type', 'message', ...customFields];
  return customFields;
}

function logExportAttempt(_userId: number, _dataTypes: string[], _status: string) {}
