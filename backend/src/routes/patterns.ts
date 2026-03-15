import { Router } from 'express';
import { getPatterns, createPattern, deletePattern } from '../controllers/patterns';
import { authenticate } from '../middleware/auth';

export const patternsRouter = Router();

patternsRouter.use(authenticate);

patternsRouter.get('/', getPatterns);
patternsRouter.post('/', createPattern);
patternsRouter.delete('/:id', deletePattern);
