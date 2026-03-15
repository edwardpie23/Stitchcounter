import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

export const getStash = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { weight, color } = req.query;

    const where: Record<string, unknown> = { userId: req.userId };

    if (weight) {
      where.weight = weight as string;
    }

    if (color) {
      where.color = { contains: color as string };
    }

    const stash = await prisma.stashEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ stash });
  } catch (error) {
    console.error('GetStash error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addStashEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { brand, name, weight, color, yardage, quantity, notes } = req.body;

    if (!brand || !name || !weight) {
      res.status(400).json({ error: 'Brand, name, and weight are required' });
      return;
    }

    const entry = await prisma.stashEntry.create({
      data: {
        brand,
        name,
        weight,
        color,
        yardage: yardage ? Number(yardage) : null,
        quantity: quantity ? Number(quantity) : 1,
        notes,
        userId: req.userId!,
      },
    });

    res.status(201).json({ entry });
  } catch (error) {
    console.error('AddStashEntry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateStashEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { brand, name, weight, color, yardage, quantity, notes } = req.body;

    const existing = await prisma.stashEntry.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Stash entry not found' });
      return;
    }

    const entry = await prisma.stashEntry.update({
      where: { id },
      data: {
        brand: brand !== undefined ? brand : existing.brand,
        name: name !== undefined ? name : existing.name,
        weight: weight !== undefined ? weight : existing.weight,
        color: color !== undefined ? color : existing.color,
        yardage: yardage !== undefined ? (yardage === null ? null : Number(yardage)) : existing.yardage,
        quantity: quantity !== undefined ? Number(quantity) : existing.quantity,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    res.json({ entry });
  } catch (error) {
    console.error('UpdateStashEntry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteStashEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.stashEntry.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Stash entry not found' });
      return;
    }

    await prisma.stashEntry.delete({ where: { id } });

    res.json({ message: 'Stash entry deleted successfully' });
  } catch (error) {
    console.error('DeleteStashEntry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
