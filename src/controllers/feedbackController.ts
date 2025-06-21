import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const assignFeedback = async (req: Request, res: Response) => {
  const { feedbackId } = req.params;
  const { assignedTo } = req.body;
  try {
    console.log(`Assigning feedback ${feedbackId} to ${assignedTo}`);
    const updated = await prisma.post.update({
      where: { id: Number(feedbackId) },
      data: { assignedTo: String(assignedTo), status: 'reviewed' },
    });
    console.log('Updated feedback:', updated);
    res.json(updated);
  } catch (error) {
    console.error('Failed to assign feedback:', error);
    res.status(500).json({ message: 'Failed to assign feedback' });
  }
};

export const updateFeedbackStatus = async (req: Request, res: Response) => {
  const { feedbackId } = req.params;
  const { status } = req.body;
  try {
    console.log(`Updating feedback ${feedbackId} status to ${status}`);
    const updated = await prisma.post.update({
      where: { id: Number(feedbackId) },
      data: { status: String(status) },
    });
    console.log('Updated feedback:', updated);
    res.json(updated);
  } catch (error) {
    console.error('Failed to update feedback status:', error);
    res.status(500).json({ message: 'Failed to update feedback status' });
  }
};
