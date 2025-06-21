"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteComment = exports.createComment = exports.getAllComments = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const errorHandler_1 = require("../utils/errorHandler");
const getAllComments = async (_req, res) => {
    try {
        const comments = await prisma_1.default.comment.findMany({
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
    }
    catch (error) {
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.getAllComments = getAllComments;
const createComment = async (req, res) => {
    try {
        const { content, postId } = req.body;
        if (!content || !postId) {
            res.status(400).json({ message: 'Content and postId are required' });
            return;
        }
        const post = await prisma_1.default.post.findUnique({
            where: { id: Number(postId) }
        });
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        const commentData = {
            content,
            post: { connect: { id: Number(postId) } },
            ...(req.user?.id && {
                author: { connect: { id: req.user.id } }
            })
        };
        const comment = await prisma_1.default.comment.create({
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
    }
    catch (error) {
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.createComment = createComment;
const deleteComment = async (req, res) => {
    try {
        const user = req.user;
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
        const comment = await prisma_1.default.comment.findUnique({
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
        if ((!comment.authorId || comment.authorId !== user.id) && user.id !== comment.post.authorId) {
            res.status(403).json({ message: 'Not authorized to delete this comment' });
            return;
        }
        await prisma_1.default.comment.delete({
            where: { id: parsedId }
        });
        res.status(204).send();
    }
    catch (error) {
        (0, errorHandler_1.handleError)(error, res);
    }
};
exports.deleteComment = deleteComment;
//# sourceMappingURL=commentController.js.map