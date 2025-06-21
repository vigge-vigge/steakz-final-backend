"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.requestPasswordReset = exports.login = exports.signup = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const dotenv_1 = __importDefault(require("dotenv"));
const hash_1 = require("../utils/hash");
const tokens_1 = require("../utils/tokens");
dotenv_1.default.config();
const signup = async (req, res) => {
    const { username, password, email, role = 'CUSTOMER' } = req.body;
    if (!username?.trim() || !password?.trim() || !email?.trim()) {
        return res.status(400).json({ message: 'Username, password and email are required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: 'Password must contain at least one number and one special character' });
    }
    if (role !== 'CUSTOMER') {
        return res.status(403).json({ message: 'Only customer registrations are allowed' });
    }
    try {
        const existingUser = await prisma_1.default.user.findFirst({
            where: {
                OR: [
                    { username: username.trim() },
                    { email: email.trim().toLowerCase() }
                ]
            }
        });
        if (existingUser) {
            return res.status(400).json({
                message: existingUser.username === username.trim()
                    ? 'Username already taken'
                    : 'Email already registered'
            });
        }
        const hashedPassword = await (0, hash_1.hashPassword)(password);
        const user = await prisma_1.default.user.create({
            data: {
                username: username.trim(),
                email: email.trim().toLowerCase(),
                password: hashedPassword,
                role: 'CUSTOMER',
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true
            }
        });
        res.status(201).json({
            message: 'User created successfully',
            user
        });
    }
    catch (error) {
        console.error('Error in signup:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
};
exports.signup = signup;
const login = async (req, res) => {
    const { username, email, password } = req.body;
    if ((!username?.trim() && !email?.trim()) || !password?.trim()) {
        return res.status(400).json({ message: 'Username/email and password are required' });
    }
    try {
        const loginField = username?.trim() || email?.trim();
        const user = await prisma_1.default.user.findFirst({
            where: {
                OR: [
                    { username: loginField },
                    { email: loginField }
                ]
            },
            select: {
                id: true,
                username: true,
                email: true,
                password: true,
                role: true,
                branchId: true,
                createdAt: true,
                updatedAt: true,
                failedLoginAttempts: true,
                lastFailedLogin: true,
                lockedUntil: true,
                passwordResetToken: true,
                resetTokenExpires: true,
                lastPasswordChange: true
            }
        });
        if (!user) {
            return res.status(401).json({
                message: 'Account not found. Please check your username and try again.'
            });
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const waitMinutes = Math.ceil((user.lockedUntil.getTime() - new Date().getTime()) / (1000 * 60));
            return res.status(423).json({
                message: `Account is temporarily locked. Please try again in ${waitMinutes} minutes.`
            });
        }
        const valid = await (0, hash_1.comparePassword)(password, user.password);
        if (!valid) {
            const failedAttempts = (user.failedLoginAttempts || 0) + 1;
            const updateData = {
                failedLoginAttempts: failedAttempts,
                lastFailedLogin: new Date()
            };
            const lockDuration = 15;
            if (failedAttempts >= 5) {
                updateData.lockedUntil = new Date(Date.now() + lockDuration * 60 * 1000);
            }
            await prisma_1.default.user.update({
                where: { id: user.id }, data: updateData
            });
            return res.status(401).json({
                message: failedAttempts >= 5
                    ? `Account locked for ${lockDuration} minutes due to too many failed attempts.`
                    : `Incorrect password. ${5 - failedAttempts} attempts remaining.`
            });
        }
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lastFailedLogin: null,
                lockedUntil: null
            }
        });
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            role: user.role,
            username: user.username,
            ...(user.branchId && { branchId: user.branchId })
        }, process.env.JWT_SECRET, {
            expiresIn: '24h',
            issuer: 'restaurant-management-api',
            audience: 'restaurant-management-client'
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            token,
            user: userWithoutPassword
        });
    }
    catch (error) {
        console.error('Error in login:', error);
        res.status(500).json({ message: 'Error during login' });
    }
};
exports.login = login;
const requestPasswordReset = async (req, res) => {
    const { email } = req.body;
    if (!email?.trim()) {
        res.status(400).json({ message: 'Email is required' });
        return;
    }
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { email: email.trim().toLowerCase() }
        });
        if (!user) {
            res.json({ message: 'If your email is registered, you will receive reset instructions.' });
            return;
        }
        const resetToken = (0, tokens_1.generateResetToken)();
        const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: resetToken,
                resetTokenExpires
            }
        });
        res.json({
            message: 'Reset instructions sent to your email.',
            debug: { resetToken, expires: resetTokenExpires }
        });
    }
    catch (error) {
        console.error('Error in requestPasswordReset:', error);
        res.status(500).json({ message: 'Error processing password reset request' });
    }
};
exports.requestPasswordReset = requestPasswordReset;
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token?.trim() || !newPassword?.trim()) {
        res.status(400).json({ message: 'Token and new password are required' });
        return;
    }
    try {
        const user = await prisma_1.default.user.findFirst({
            where: { passwordResetToken: token }
        });
        if (!user || !user.resetTokenExpires || (0, tokens_1.isTokenExpired)(user.resetTokenExpires)) {
            res.status(400).json({ message: 'Invalid or expired reset token' });
            return;
        }
        if (newPassword.length < 8) {
            res.status(400).json({ message: 'Password must be at least 8 characters long' });
            return;
        }
        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])/;
        if (!passwordRegex.test(newPassword)) {
            res.status(400).json({
                message: 'Password must contain at least one number and one special character'
            });
            return;
        }
        const hashedPassword = await (0, hash_1.hashPassword)(newPassword);
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                resetTokenExpires: null,
                lastPasswordChange: new Date(),
                failedLoginAttempts: 0,
                lockedUntil: null
            }
        });
        res.json({ message: 'Password has been reset successfully' });
    }
    catch (error) {
        console.error('Error in resetPassword:', error);
        res.status(500).json({ message: 'Error resetting password' });
    }
};
exports.resetPassword = resetPassword;
//# sourceMappingURL=authController.js.map