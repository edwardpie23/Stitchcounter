import { Router } from 'express';
import { updateCounter, deleteCounter } from '../controllers/counters';
import { authenticate } from '../middleware/auth';

export const countersRouter = Router();

countersRouter.use(authenticate);

countersRouter.put('/:id', updateCounter);
countersRouter.delete('/:id', deleteCounter);
