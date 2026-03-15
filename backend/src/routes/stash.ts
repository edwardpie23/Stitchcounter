import { Router } from 'express';
import { getStash, addStashEntry, updateStashEntry, deleteStashEntry } from '../controllers/stash';
import { authenticate } from '../middleware/auth';

export const stashRouter = Router();

stashRouter.use(authenticate);

stashRouter.get('/', getStash);
stashRouter.post('/', addStashEntry);
stashRouter.put('/:id', updateStashEntry);
stashRouter.delete('/:id', deleteStashEntry);
