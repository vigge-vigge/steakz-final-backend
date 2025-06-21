"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFeedbackStatus = exports.assignFeedback = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const assignFeedback = async (req, res) => {
    const { feedbackId } = req.params;
    const { assignedTo } = req.body;
    try {
        console.log(`Assigning feedback ${feedbackId} to ${assignedTo}`);
        const updated = await prisma_1.default.post.update({
            where: { id: Number(feedbackId) },
            data: { assignedTo: String(assignedTo), status: 'reviewed' },
        });
        console.log('Updated feedback:', updated);
        res.json(updated);
    }
    catch (error) {
        console.error('Failed to assign feedback:', error);
        res.status(500).json({ message: 'Failed to assign feedback' });
    }
};
exports.assignFeedback = assignFeedback;
const updateFeedbackStatus = async (req, res) => {
    const { feedbackId } = req.params;
    const { status } = req.body;
    try {
        console.log(`Updating feedback ${feedbackId} status to ${status}`);
        const updated = await prisma_1.default.post.update({
            where: { id: Number(feedbackId) },
            data: { status: String(status) },
        });
        console.log('Updated feedback:', updated);
        res.json(updated);
    }
    catch (error) {
        console.error('Failed to update feedback status:', error);
        res.status(500).json({ message: 'Failed to update feedback status' });
    }
};
exports.updateFeedbackStatus = updateFeedbackStatus;
//# sourceMappingURL=feedbackController.js.map