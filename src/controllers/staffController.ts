/**
 * Staff Management Controller
 * 
 * This module handles all staff-related operations for the restaurant management system.
 * It provides comprehensive staff management capabilities including hiring, role assignment,
 * performance tracking, and branch-specific staff administration.
 * 
 * Features:
 * - Staff member creation with role-based authorization
 * - Performance tracking and evaluation
 * - Branch-specific staff management
 * - Role-based access control for staff operations
 * - Staff scheduling and shift management
 * - Comprehensive staff information management
 * 
 * Role Hierarchy and Permissions:
 * - ADMIN: Can create and manage all staff roles across all branches
 * - GENERAL_MANAGER: Can create and manage CHEF, CASHIER, and BRANCH_MANAGER roles
 * - BRANCH_MANAGER: Can only create CHEF and CASHIER roles within their branch
 * 
 * Staff Roles Available:
 * - BRANCH_MANAGER: Manages individual restaurant branches
 * - CHEF: Kitchen staff responsible for food preparation
 * - CASHIER: Front-of-house staff handling orders and payments
 */

import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { hashPassword } from '../utils/hash';

/**
 * Create New Staff Member
 * 
 * Creates a new staff member with role-based authorization and comprehensive validation.
 * Different user roles have different permissions for creating staff members.
 * 
 * Authorization Rules:
 * - ADMIN: Can create any staff role for any branch
 * - GENERAL_MANAGER: Can create CHEF, CASHIER, and BRANCH_MANAGER roles
 * - BRANCH_MANAGER: Can only create CHEF and CASHIER for their own branch
 * 
 * Validation:
 * - All required fields must be provided
 * - Username and email must be unique
 * - Role must be valid for the creator's permissions
 * - Branch assignment must be valid for creator's access level
 * 
 * @param req - Request with staff member data (username, email, password, role, branchId)
 * @param res - Response with created staff member data or error message
 */
export const createStaffMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, role, branchId } = req.body;
    const adminUser = req.user!; // Authenticated user creating the staff member

    // Input validation - ensure all required fields are present
    if (!username?.trim() || !password?.trim() || !email?.trim() || !role) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    // Role authorization check - validate creator can assign the requested role
    const validRoles = ['CHEF', 'CASHIER', 'BRANCH_MANAGER'];
    if (adminUser.role === 'GENERAL_MANAGER' && !validRoles.includes(role)) {
      res.status(403).json({ message: 'Invalid role specified for staff member' });
      return;
    }

    // Branch managers have restricted role creation permissions
    if (adminUser.role === 'BRANCH_MANAGER' && !['CHEF', 'CASHIER'].includes(role)) {
      res.status(403).json({ message: 'Branch managers can only create Chef and Cashier roles' });
      return;
    }

    // Branch authorization check - ensure staff is created for appropriate branch
    if (adminUser.role === 'BRANCH_MANAGER') {
      // Branch managers must create staff for their own branch only
      if (!branchId || adminUser.branchId !== branchId) {
        res.status(403).json({ message: 'You can only create staff for your branch' });
        return;
      }
    }

    // Check for existing username or email to prevent duplicates
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      res.status(400).json({ 
        message: existingUser.username === username 
          ? 'Username already exists' 
          : 'Email already registered' 
      });
      return;
    }

    // Hash password securely before storing
    const hashedPassword = await hashPassword(password);
    
    // Create new staff member with audit trail
    const newStaff = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim(),
        password: hashedPassword,
        role,
        branchId,
        createdById: adminUser.id // Track who created this staff member
      },
      select: {
        // Return safe fields only (no password)
        id: true,
        username: true,
        email: true,
        role: true,
        branchId: true,
        createdAt: true,
        createdBy: {
          select: {
            username: true // Include creator information for audit
          }
        }
      }
    });

    res.status(201).json({
      message: 'Staff member created successfully',
      staff: newStaff
    });
  } catch (error) {
    console.error('Error in createStaffMember:', error);
    res.status(500).json({ message: 'Error creating staff member' });
  }
};

// Get staff members (filtered by branch for branch managers)
export const getStaffMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { branchId } = req.query;
    
    // Build the where clause based on user role and branch
    let where: any = {};
    
    if (user.role === 'BRANCH_MANAGER') {
      // Branch managers can only see staff from their specific branch
      // Must have a branchId and it must match the manager's branch
      where.branchId = user.branchId;
      where.role = { not: 'CUSTOMER' };
    } else if (user.role === 'GENERAL_MANAGER') {
      // General managers can see all staff, optionally filter by branch
      if (branchId) {
        where.branchId = Number(branchId);
      }
      where.role = { not: 'CUSTOMER' };
    } else if (user.role === 'ADMIN') {
      // Admins can see all staff, optionally filter by branch
      if (branchId) {
        where.branchId = Number(branchId);
      }
      where.role = { not: 'CUSTOMER' };
    } else {
      // Other roles (CHEF, CASHIER) can only see staff from their branch
      where.branchId = user.branchId;
      where.role = { not: 'CUSTOMER' };
    }

    const staff = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        branchId: true,
        createdAt: true,
        branch: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ staff });
  } catch (error) {
    console.error('Error in getStaffMembers:', error);
    res.status(500).json({ message: 'Error fetching staff members' });
  }
};

// Update staff member
export const updateStaffMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { username, email, password, role, branchId } = req.body;
    const adminUser = req.user!;

    // Find target user
    const targetUser = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: {
        branch: true
      }
    });

    if (!targetUser) {
      res.status(404).json({ message: 'Staff member not found' });
      return;
    }    // Authorization checks
    if (adminUser.role === 'BRANCH_MANAGER') {
      // Branch managers can only update staff in their own branch
      if (!targetUser.branchId || targetUser.branchId !== adminUser.branchId) {
        res.status(403).json({ message: 'You can only update staff in your branch' });
        return;
      }
      // Branch managers cannot change staff roles
      if (role && role !== targetUser.role) {
        res.status(403).json({ message: 'Branch managers cannot change staff roles' });
        return;
      }
      // Branch managers cannot move staff to different branches
      if (branchId && branchId !== adminUser.branchId) {
        res.status(403).json({ message: 'You cannot move staff to different branches' });
        return;
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (username?.trim()) {
      const existingUser = await prisma.user.findUnique({
        where: { username: username.trim() }
      });
      if (existingUser && existingUser.id !== Number(id)) {
        res.status(400).json({ message: 'Username already exists' });
        return;
      }
      updateData.username = username.trim();
    }

    if (email?.trim()) {
      const existingUser = await prisma.user.findUnique({
        where: { email: email.trim() }
      });
      if (existingUser && existingUser.id !== Number(id)) {
        res.status(400).json({ message: 'Email already registered' });
        return;
      }
      updateData.email = email.trim();
    }

    if (password?.trim()) {
      updateData.password = await hashPassword(password);
    }

    if (role && adminUser.role !== 'BRANCH_MANAGER') {
      updateData.role = role;
    }

    if (branchId && adminUser.role !== 'BRANCH_MANAGER') {
      updateData.branchId = branchId;
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        branchId: true,
        updatedAt: true,
        branch: {
          select: {
            name: true
          }
        }
      }
    });

    res.json({
      message: 'Staff member updated successfully',
      staff: updatedUser
    });
  } catch (error) {
    console.error('Error in updateStaffMember:', error);
    res.status(500).json({ message: 'Error updating staff member' });
  }
};

// Delete staff member
export const deleteStaffMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminUser = req.user!;

    const targetUser = await prisma.user.findUnique({
      where: { id: Number(id) }
    });

    if (!targetUser) {
      res.status(404).json({ message: 'Staff member not found' });
      return;
    }

    // Authorization checks
    if (adminUser.role === 'BRANCH_MANAGER') {
      if (targetUser.branchId !== adminUser.branchId) {
        res.status(403).json({ message: 'You can only delete staff from your branch' });
        return;
      }
    }

    // Prevent deleting users with higher privileges
    if (
      (adminUser.role === 'BRANCH_MANAGER' && ['BRANCH_MANAGER', 'GENERAL_MANAGER', 'ADMIN'].includes(targetUser.role)) ||
      (adminUser.role === 'GENERAL_MANAGER' && ['GENERAL_MANAGER', 'ADMIN'].includes(targetUser.role))
    ) {
      res.status(403).json({ message: 'Cannot delete user with higher privileges' });
      return;
    }

    await prisma.user.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Error in deleteStaffMember:', error);
    res.status(500).json({ message: 'Error deleting staff member' });
  }
};
