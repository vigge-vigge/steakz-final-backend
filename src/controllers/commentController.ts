import { Response, Request } from 'express';
import prisma from '../utils/prisma';
import { handleError } from '../utils/errorHandler';
import { RequestHandler } from 'express';
import { AuthenticatedUser } from '../types/auth';
import { Prisma } from '@prisma/client';

export const getAllComments: RequestHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
        const comments = await prisma.comment.findMany({
            include: {
                author: {
                    select: {
                        username: true
                    }
                },
                post: {
                    select: {
                        title: true
                    }
                }
            }
        });

        res.json(comments);
    } catch (error) {
        handleError(error, res);
    }
};

export const createComment: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { content, postId } = req.body;

        if (!content || !postId) {
            res.status(400).json({ message: 'Content and postId are required' });
            return;
        }

        // First, check if the post exists
        const post = await prisma.post.findUnique({
            where: { id: Number(postId) }
        });

        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }

        const commentData: Prisma.CommentCreateInput = {
            content,
            post: { connect: { id: Number(postId) } },
            ...(req.user?.id && {
                author: { connect: { id: req.user.id } }
            })
        };

        const comment = await prisma.comment.create({
            data: commentData,
            include: {
                author: {
                    select: {
                        username: true
                    }
                }
            }
        });

        res.status(201).json(comment);
    } catch (error) {
        handleError(error, res);
    }
};

export const deleteComment: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as { user?: AuthenticatedUser }).user;
        if (!user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const { id } = req.params;
        const parsedId = parseInt(id);

        if (isNaN(parsedId)) {
            res.status(400).json({ message: 'Invalid comment ID' });
            return;
        }

        // Get comment first to check ownership
        const comment = await prisma.comment.findUnique({
            where: { id: parsedId },
            include: {
                post: {
                    select: {
                        authorId: true
                    }
                }
            }
        });

        if (!comment) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }

        // Only allow deletion by comment author or post author
        if ((!comment.authorId || comment.authorId !== user.id) && user.id !== comment.post.authorId) {
            res.status(403).json({ message: 'Not authorized to delete this comment' });
            return;
        }

        await prisma.comment.delete({
            where: { id: parsedId }
        });

        res.status(204).send();
    } catch (error) {
        handleError(error, res);
    }
};