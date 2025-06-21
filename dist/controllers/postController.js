"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePost = exports.createPost = exports.getMyPosts = exports.getPost = exports.getPosts = exports.getAllPosts = void 0;
const errorHandler_1 = require("../utils/errorHandler");
const prisma_1 = __importDefault(require("../utils/prisma"));
const getAllPosts = async (_req, res) => {
    try {
        const posts = await prisma_1.default.post.findMany({
            include: {
                author: {
                    select: {
                        username: true
                    }
                },
                comments: {
                    include: {
                        author: {
                            select: {
                                username: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        const formattedPosts = posts.map(post => ({
            id: post.id,
            title: post.title,
            content: post.content,
            published: post.published,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            author: post.author,
            comments: post.comments.map(comment => ({
                id: comment.id,
                content: comment.content,
                createdAt: comment.createdAt,
                commenterName: comment.author?.username ?? 'Anonymous'
            }))
        }));
        return res.json(formattedPosts);
    }
    catch (error) {
        return (0, errorHandler_1.handleError)(error, res);
    }
};
exports.getAllPosts = getAllPosts;
const getPosts = async (_req, res) => {
    try {
        const posts = await prisma_1.default.post.findMany({
            include: {
                author: {
                    select: {
                        id: true,
                        username: true
                    }
                },
                comments: {
                    include: {
                        author: {
                            select: {
                                username: true
                            }
                        }
                    }
                }
            }
        });
        const formattedPosts = posts.map(post => ({
            ...post,
            comments: post.comments.map(comment => ({
                ...comment,
                commenterName: comment.author ? comment.author.username : 'Anonymous'
            }))
        }));
        res.json(formattedPosts);
        return;
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching posts' });
        return;
    }
};
exports.getPosts = getPosts;
const getPost = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('getPost: received id param:', id);
        const parsedId = typeof id === 'string' ? Number(id) : id;
        console.log('getPost: parsedId:', parsedId);
        if (!Number.isInteger(parsedId) || parsedId <= 0) {
            res.status(400).json({ message: 'Invalid post id' });
            return;
        }
        const post = await prisma_1.default.post.findUnique({
            where: { id: parsedId },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true
                    }
                },
                comments: {
                    include: {
                        author: {
                            select: {
                                username: true
                            }
                        }
                    }
                }
            }
        });
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        const formattedPost = {
            ...post,
            author: post.author || { id: null, username: null },
            comments: (post.comments || []).map(comment => ({
                ...comment,
                commenterName: comment.author ? comment.author.username : 'Anonymous'
            }))
        };
        res.json(formattedPost);
        return;
    }
    catch (error) {
        console.error('Error in getPost:', error);
        res.status(500).json({ message: 'Error fetching post', error: error instanceof Error ? error.message : error });
        return;
    }
};
exports.getPost = getPost;
const getMyPosts = async (req, res) => {
    try {
        const parsedUserId = req.user?.id;
        if (!parsedUserId || typeof parsedUserId !== 'number' || isNaN(parsedUserId) || !isFinite(parsedUserId)) {
            res.status(401).json({ message: 'Invalid userId in token', user: req.user });
            return;
        }
        const userExists = await prisma_1.default.user.findUnique({ where: { id: parsedUserId } });
        if (!userExists) {
            res.status(403).json({ message: 'User does not exist', userId: parsedUserId });
            return;
        }
        const posts = await prisma_1.default.post.findMany({
            where: { authorId: parsedUserId },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true
                    }
                },
                comments: {
                    include: {
                        author: {
                            select: {
                                username: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        if (!posts) {
            res.json([]);
            return;
        }
        const formattedPosts = posts.map(post => ({
            ...post,
            comments: post.comments.map(comment => ({
                ...comment,
                commenterName: comment.author ? comment.author.username : 'Anonymous'
            }))
        }));
        res.json(formattedPosts);
        return;
    }
    catch (error) {
        console.error('Error in getMyPosts:', error);
        res.status(500).json({ message: 'Failed to fetch your posts', error: error instanceof Error ? error.message : error });
        return;
    }
};
exports.getMyPosts = getMyPosts;
const createPost = async (req, res) => {
    try {
        const parsedUserId = req.user?.id;
        const { title, content, rating } = req.body;
        if (!title || !content || typeof rating !== 'number') {
            res.status(400).json({ message: 'Title, content, and rating are required' });
            return;
        }
        if (typeof parsedUserId !== 'number' || isNaN(parsedUserId)) {
            res.status(403).json({ message: 'User does not exist', userId: parsedUserId });
            return;
        }
        const userExists = await prisma_1.default.user.findUnique({ where: { id: parsedUserId } });
        if (!userExists) {
            res.status(403).json({ message: 'User does not exist', userId: parsedUserId });
            return;
        }
        const post = await prisma_1.default.post.create({
            data: {
                title,
                content,
                rating,
                authorId: parsedUserId
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true
                    }
                },
                comments: {
                    include: {
                        author: {
                            select: {
                                username: true
                            }
                        }
                    }
                }
            }
        });
        const formattedPost = {
            ...post,
            comments: (post.comments || []).map(comment => ({
                ...comment,
                commenterName: comment.author ? comment.author.username : 'Anonymous'
            }))
        };
        res.status(201).json(formattedPost);
    }
    catch (error) {
        console.error('Error in createPost:', error);
        res.status(500).json({ message: 'Failed to create post', error: error instanceof Error ? error.message : error });
    }
};
exports.createPost = createPost;
const deletePost = async (req, res) => {
    try {
        const userId = req.user?.id;
        const postId = Number(req.params.id);
        if (!postId || isNaN(postId)) {
            res.status(400).json({ message: 'Invalid post id' });
            return;
        }
        const post = await prisma_1.default.post.findUnique({ where: { id: postId } });
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        if (post.authorId !== userId) {
            res.status(403).json({ message: 'You are not allowed to delete this post' });
            return;
        }
        await prisma_1.default.post.delete({ where: { id: postId } });
        res.status(204).end();
    }
    catch (error) {
        console.error('Error in deletePost:', error);
        res.status(500).json({ message: 'Failed to delete post', error: error instanceof Error ? error.message : error });
    }
};
exports.deletePost = deletePost;
//# sourceMappingURL=postController.js.map