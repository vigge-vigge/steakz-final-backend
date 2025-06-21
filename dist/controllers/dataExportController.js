"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startExport = startExport;
exports.getExportStatus = getExportStatus;
exports.downloadExportFile = downloadExportFile;
const prisma_1 = __importDefault(require("../utils/prisma"));
const json2csv_1 = require("json2csv");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const exportJobs = {};
async function startExport(req, res) {
    try {
        const { dataTypes, dateRange, customFields } = req.body;
        const jobId = (0, uuid_1.v4)();
        exportJobs[jobId] = { status: 'processing', progress: 0 };
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        process.nextTick(() => processExportJob(jobId, req.user.id, dataTypes, dateRange, customFields));
        return res.json({ jobId });
    }
    catch (err) {
        return res.status(500).json({ message: 'Failed to start export' });
    }
}
async function getExportStatus(req, res) {
    const { jobId } = req.params;
    const job = exportJobs[jobId];
    if (!job)
        return res.status(404).json({ status: 'not_found' });
    return res.json({ status: job.status, progress: job.progress });
}
async function downloadExportFile(req, res) {
    const { jobId } = req.params;
    const job = exportJobs[jobId];
    if (!job || job.status !== 'completed' || !job.filePath)
        return res.status(404).json({ message: 'File not ready' });
    res.download(job.filePath, 'data-export.csv', err => {
        if (!err && job.filePath)
            fs_1.default.unlink(job.filePath, () => { });
    });
    return;
}
async function processExportJob(jobId, userId, dataTypes, dateRange, customFields) {
    try {
        let allData = [];
        let headers = [];
        let progress = 0;
        for (const [i, type] of dataTypes.entries()) {
            let data = [];
            if (type === 'sales') {
                data = await exportSalesData(dateRange?.start, dateRange?.end, customFields);
                headers = generateCSVHeaders('sales', customFields);
            }
            else if (type === 'inventory') {
                data = await exportInventoryData(customFields);
                headers = generateCSVHeaders('inventory', customFields);
            }
            else if (type === 'logs') {
                data = await exportLogsData(dateRange?.start, dateRange?.end, customFields);
                headers = generateCSVHeaders('logs', customFields);
            }
            allData = allData.concat(data);
            progress = Math.round(((i + 1) / dataTypes.length) * 100);
            exportJobs[jobId].progress = progress;
        }
        const parser = new json2csv_1.Parser({ fields: headers });
        const csv = parser.parse(allData);
        const filePath = path_1.default.join(__dirname, '../../tmp', `${jobId}.csv`);
        fs_1.default.mkdirSync(path_1.default.dirname(filePath), { recursive: true });
        fs_1.default.writeFileSync(filePath, csv);
        exportJobs[jobId] = { status: 'completed', progress: 100, filePath };
        logExportAttempt(userId, dataTypes, 'success');
        await importExportedData(allData, dataTypes);
    }
    catch (err) {
        exportJobs[jobId] = { status: 'failed', progress: 100, error: err.message };
        logExportAttempt(userId, dataTypes, 'failed');
    }
}
async function importExportedData(data, dataTypes) {
    for (const type of dataTypes) {
        if (type === 'sales') {
            for (const order of data) {
                if (order.id && order.totalAmount) {
                    await prisma_1.default.order.upsert({
                        where: { id: order.id },
                        update: { ...order },
                        create: { ...order }
                    });
                }
            }
        }
        else if (type === 'inventory') {
            for (const item of data) {
                if (item.id && item.name) {
                    await prisma_1.default.inventoryItem.upsert({
                        where: { id: item.id },
                        update: { ...item },
                        create: { ...item }
                    });
                }
            }
        }
    }
}
async function exportSalesData(startDate, endDate, _fields = []) {
    return await prisma_1.default.order.findMany({
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
async function exportInventoryData(_fields = []) {
    return await prisma_1.default.inventoryItem.findMany({
        where: { quantity: { gt: 0 } },
        select: {
            id: true,
            name: true,
            quantity: true,
        },
    });
}
async function exportLogsData(_startDate, _endDate, _logTypes = []) {
    return [];
}
function generateCSVHeaders(dataType, customFields = []) {
    if (dataType === 'sales')
        return ['id', 'createdAt', 'totalAmount', ...customFields];
    if (dataType === 'inventory')
        return ['id', 'name', 'quantity', ...customFields];
    if (dataType === 'logs')
        return ['id', 'timestamp', 'type', 'message', ...customFields];
    return customFields;
}
function logExportAttempt(_userId, _dataTypes, _status) { }
//# sourceMappingURL=dataExportController.js.map