import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

export const getPatterns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patterns = await prisma.pattern.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ patterns });
  } catch (error) {
    console.error('GetPatterns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPattern = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, sourceUrl, notes, tags, imageUrl } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Pattern name is required' });
      return;
    }

    const pattern = await prisma.pattern.create({
      data: {
        name,
        sourceUrl,
        notes,
        tags,
        imageUrl,
        userId: req.userId!,
      },
    });

    res.status(201).json({ pattern });
  } catch (error) {
    console.error('CreatePattern error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deletePattern = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.pattern.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Pattern not found' });
      return;
    }

    await prisma.pattern.delete({ where: { id } });

    res.json({ message: 'Pattern deleted successfully' });
  } catch (error) {
    console.error('DeletePattern error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
