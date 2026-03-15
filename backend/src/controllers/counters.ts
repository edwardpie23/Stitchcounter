import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

export const addCounter = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: projectId } = req.params;
    const { name, target } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Counter name is required' });
      return;
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.userId },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const counter = await prisma.counter.create({
      data: {
        name,
        target: target ? Number(target) : null,
        projectId,
      },
    });

    res.status(201).json({ counter });
  } catch (error) {
    console.error('AddCounter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCounter = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, value, target } = req.body;

    // Verify counter belongs to user's project
    const existing = await prisma.counter.findFirst({
      where: { id, project: { userId: req.userId } },
    });

    if (!existing) {
      res.status(404).json({ error: 'Counter not found' });
      return;
    }

    const counter = await prisma.counter.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        value: value !== undefined ? Number(value) : existing.value,
        target: target !== undefined ? (target === null ? null : Number(target)) : existing.target,
      },
    });

    res.json({ counter });
  } catch (error) {
    console.error('UpdateCounter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCounter = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.counter.findFirst({
      where: { id, project: { userId: req.userId } },
    });

    if (!existing) {
      res.status(404).json({ error: 'Counter not found' });
      return;
    }

    await prisma.counter.delete({ where: { id } });

    res.json({ message: 'Counter deleted successfully' });
  } catch (error) {
    console.error('DeleteCounter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
