import { Request, Response } from 'express';
import { handleError } from '../utils/errorHandler';
import prisma from '../utils/prisma';

// Get all posts
export const getAllPosts = async (_req: Request, res: Response) => {
    try {
        const posts = await prisma.post.findMany({
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

        // Transform posts for response
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
    } catch (error) {
        return handleError(error, res);
    }
};

// (Removed duplicate createPost function to resolve redeclaration error)

// Fetch all posts (for /api/posts)
export const getPosts = async (_req: Request, res: Response): Promise<void> => {
    try {
        const posts = await prisma.post.findMany({
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

        // Format the response to handle comment author names correctly
        const formattedPosts = posts.map(post => ({
            ...post,
            comments: post.comments.map(comment => ({
                ...comment,
                commenterName: comment.author ? comment.author.username : 'Anonymous'
            }))
        }));

        res.json(formattedPosts);
        return;
    } catch (error) {
        res.status(500).json({ message: 'Error fetching posts' });
        return;
    }
};

// Fetch a single post by ID (for /api/posts/:id)
export const getPost = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        // Debug: log incoming id and parsedId
        console.log('getPost: received id param:', id);
        const parsedId = typeof id === 'string' ? Number(id) : id;
        console.log('getPost: parsedId:', parsedId);
        // Defensive: ensure id is a valid positive integer
        if (!Number.isInteger(parsedId) || parsedId <= 0) {
            res.status(400).json({ message: 'Invalid post id' });
            return;
        }
        const post = await prisma.post.findUnique({
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
        // Defensive: handle possible null/undefined author or comments
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
    } catch (error) {
        console.error('Error in getPost:', error);
        res.status(500).json({ message: 'Error fetching post', error: error instanceof Error ? error.message : error });
        return;
    }
};

// Fetch posts for the currently authenticated user (for /api/posts/my)
export const getMyPosts = async (req: Request, res: Response): Promise<void> => {
    try {
        // Use only req.user.id (set by authMiddleware) for the authenticated user
        const parsedUserId = req.user?.id;
        if (!parsedUserId || typeof parsedUserId !== 'number' || isNaN(parsedUserId) || !isFinite(parsedUserId)) {
            res.status(401).json({ message: 'Invalid userId in token', user: req.user });
            return;
        }
        // Defensive: check that user exists in DB
        const userExists = await prisma.user.findUnique({ where: { id: parsedUserId } });
        if (!userExists) {
            res.status(403).json({ message: 'User does not exist', userId: parsedUserId });
            return;
        }
        // If no posts, return empty array (not error)
        const posts = await prisma.post.findMany({
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
    } catch (error) {
        console.error('Error in getMyPosts:', error);
        res.status(500).json({ message: 'Failed to fetch your posts', error: error instanceof Error ? error.message : error });
        return;
    }
};

// Create a new post (for POST /api/posts)
export const createPost = async (req: Request, res: Response): Promise<void> => {
    try {
        // Use only req.user.id (set by authMiddleware) for the authenticated user
        const parsedUserId = req.user?.id;
        const { title, content, rating } = req.body;
        if (!title || !content || typeof rating !== 'number') {
            res.status(400).json({ message: 'Title, content, and rating are required' });
            return;
        }
        // Defensive: check that user exists in DB before creating post
        if (typeof parsedUserId !== 'number' || isNaN(parsedUserId)) {
            res.status(403).json({ message: 'User does not exist', userId: parsedUserId });
            return;
        }
        const userExists = await prisma.user.findUnique({ where: { id: parsedUserId } });
        if (!userExists) {
            res.status(403).json({ message: 'User does not exist', userId: parsedUserId });
            return;
        }
        const post = await prisma.post.create({
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
        // Ensure post.comments is always an array
        const formattedPost = {
            ...post,
            comments: (post.comments || []).map(comment => ({
                ...comment,
                commenterName: comment.author ? comment.author.username : 'Anonymous'
            }))
        };
        res.status(201).json(formattedPost);
    } catch (error) {
        console.error('Error in createPost:', error);
        res.status(500).json({ message: 'Failed to create post', error: error instanceof Error ? error.message : error });
    }
};

// Delete a post by ID (for DELETE /api/posts/:id)
export const deletePost = async (req: Request, res: Response): Promise<void> => {
    try {
        // Use only req.user.id (set by authMiddleware)
        const userId = req.user?.id;
        const postId = Number(req.params.id);
        if (!postId || isNaN(postId)) {
            res.status(400).json({ message: 'Invalid post id' });
            return;
        }
        // Find the post and check ownership
        const post = await prisma.post.findUnique({ where: { id: postId } });
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }
        if (post.authorId !== userId) {
            res.status(403).json({ message: 'You are not allowed to delete this post' });
            return;
        }
        await prisma.post.delete({ where: { id: postId } });
        res.status(204).end();
    } catch (error) {
        console.error('Error in deletePost:', error);
        res.status(500).json({ message: 'Failed to delete post', error: error instanceof Error ? error.message : error });
    }
};