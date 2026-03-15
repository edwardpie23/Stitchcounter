import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.userId },
      include: {
        counters: true,
        pattern: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ projects });
  } catch (error) {
    console.error('GetProjects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: { id, userId: req.userId },
      include: {
        counters: { orderBy: { createdAt: 'asc' } },
        pattern: true,
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ project });
  } catch (error) {
    console.error('GetProject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      yarnBrand,
      yarnWeight,
      yarnColor,
      needleSize,
      patternId,
      notes,
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Project name is required' });
      return;
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        yarnBrand,
        yarnWeight,
        yarnColor,
        needleSize,
        patternId: patternId || null,
        notes,
        userId: req.userId!,
      },
      include: {
        counters: true,
        pattern: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ project });
  } catch (error) {
    console.error('CreateProject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      yarnBrand,
      yarnWeight,
      yarnColor,
      needleSize,
      status,
      notes,
      patternId,
    } = req.body;

    const existing = await prisma.project.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        yarnBrand,
        yarnWeight,
        yarnColor,
        needleSize,
        status,
        notes,
        patternId: patternId !== undefined ? patternId : existing.patternId,
      },
      include: {
        counters: { orderBy: { createdAt: 'asc' } },
        pattern: true,
      },
    });

    res.json({ project });
  } catch (error) {
    console.error('UpdateProject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.project.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    await prisma.project.delete({ where: { id } });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('DeleteProject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
