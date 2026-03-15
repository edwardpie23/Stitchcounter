import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { authRouter } from './routes/auth';
import { projectsRouter } from './routes/projects';
import { countersRouter } from './routes/counters';
import { patternsRouter } from './routes/patterns';
import { stashRouter } from './routes/stash';
import { imagePatternRouter } from './routes/imagePattern';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/counters', countersRouter);
app.use('/api/patterns', patternsRouter);
app.use('/api/stash', stashRouter);
app.use('/api/image-patterns', imagePatternRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
