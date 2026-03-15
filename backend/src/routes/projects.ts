import { Router } from 'express';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projects';
import { addCounter } from '../controllers/counters';
import { authenticate } from '../middleware/auth';

export const projectsRouter = Router();

projectsRouter.use(authenticate);

projectsRouter.get('/', getProjects);
projectsRouter.post('/', createProject);
projectsRouter.get('/:id', getProject);
projectsRouter.put('/:id', updateProject);
projectsRouter.delete('/:id', deleteProject);
projectsRouter.post('/:id/counters', addCounter);
