import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { runGenerationPipeline, getHistory, updateQuizScoreInHistory } from './server/pipeline';

// Load environmental variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static assets from public folder (in case of direct production builds/access)
app.use('/lessons', express.static(path.join(process.cwd(), 'public', 'lessons')));

// ------------------------------------------------------------------------------
// API Endpoints
// ------------------------------------------------------------------------------

/**
 * POST /api/lessons
 * Initiates the multi-step lesson generation pipeline asynchronously.
 */
app.post('/api/lessons', async (req, res) => {
  const { topic, subject, options } = req.body;

  if (!topic || !subject) {
    return res.status(400).json({ error: 'Topic and subject tag are required.' });
  }

  // Sensible default settings
  const pipelineOptions = {
    llmProvider: options?.llmProvider || 'gemini',
    imageProvider: options?.imageProvider || 'openai',
    ttsProvider: options?.ttsProvider || 'elevenlabs',
    ttsVoice: options?.ttsVoice || 'Rachel',
    isMockMode: options?.isMockMode !== false, // Default to mock mode for safety/out-of-box experience
  };

  try {
    // Generate a unique lesson ID and start the background promise
    // runGenerationPipeline manages its own state by writing to public/lessons/:id/status.json
    console.log(`Starting generation pipeline for topic: "${topic}" (${subject}) [MockMode: ${pipelineOptions.isMockMode}]`);
    
    // We get the lessonId synchronously before starting the promise, or we let the pipeline return it.
    // To do this asynchronously, we trigger it and respond immediately.
    // The pipeline creates the directory and status.json instantly.
    const lessonId = path.basename(
      await new Promise<string>((resolve) => {
        // We run the pipeline in the background so the HTTP request completes instantly
        const idPromise = runGenerationPipeline(topic, subject, pipelineOptions);
        
        // Find the folder name by extracting the uuid from output (which starts synchronously)
        // Wait 100ms to ensure the directory is written
        setTimeout(() => {
          // Resolve with temporary session ID
          idPromise.then(
            (finalId) => console.log(`Pipeline completed successfully for lesson: ${finalId}`),
            (err) => console.error(`Pipeline failed:`, err)
          );
        }, 100);
        
        // To make sure we have the folder instantly, let's just generate the UUID here and pass it,
        // or since runGenerationPipeline creates it, let's return the folder ID.
        // Actually, runGenerationPipeline returns a promise of the lessonId. Let's make it so we know the lessonId here!
      })
    );

  } catch (error) {
    // Since we want to return the lessonId instantly, we can pre-generate the UUID in server.ts!
  }
});

// Let's rewrite the route to pre-generate the UUID for immediate response
app.post('/api/lessons', (req, res) => {
  const { topic, subject, options } = req.body;

  if (!topic || !subject) {
    return res.status(400).json({ error: 'Topic and subject tag are required.' });
  }

  // Pre-generate UUID
  const { v4: uuidv4 } = require('uuid');
  const lessonId = uuidv4();

  const pipelineOptions = {
    llmProvider: options?.llmProvider || 'gemini',
    imageProvider: options?.imageProvider || 'openai',
    ttsProvider: options?.ttsProvider || 'elevenlabs',
    ttsVoice: options?.ttsVoice || 'Rachel',
    isMockMode: options?.isMockMode !== false,
  };

  console.log(`[API] Initiating pipeline for: "${topic}" (${subject}) -> LessonID: ${lessonId}`);

  // Start background process
  runGenerationPipeline(topic, subject, { ...pipelineOptions, isMockMode: pipelineOptions.isMockMode })
    .then((finalId) => {
      console.log(`[Pipeline] Completed successfully for ${finalId}`);
    })
    .catch((err) => {
      console.error(`[Pipeline] Failed for ${lessonId}:`, err);
    });

  // Respond immediately with the lesson ID
  return res.json({ lessonId });
});

/**
 * GET /api/lessons/:id/status
 * Returns the current progress, current step, and completion state.
 */
app.get('/api/lessons/:id/status', (req, res) => {
  const { id } = req.params;
  const statusPath = path.join(process.cwd(), 'public', 'lessons', id, 'status.json');

  if (!fs.existsSync(statusPath)) {
    return res.status(404).json({ error: 'Lesson generation not found or not started yet.' });
  }

  try {
    const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    return res.json(statusData);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to read status data.' });
  }
});

/**
 * POST /api/lessons/:id/quiz-score
 * Updates the student's quiz score in the central history index.
 */
app.post('/api/lessons/:id/quiz-score', (req, res) => {
  const { id } = req.params;
  const { score } = req.body;

  if (score === undefined || typeof score !== 'number') {
    return res.status(400).json({ error: 'Valid numerical quiz score is required.' });
  }

  try {
    updateQuizScoreInHistory(id, score);
    
    // Also save the score directly inside the lesson's metadata.json
    const metadataPath = path.join(process.cwd(), 'public', 'lessons', id, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      metadata.quizScore = score;
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    }

    return res.json({ success: true, score });
  } catch (error) {
    console.error('Failed to update quiz score:', error);
    return res.status(500).json({ error: 'Failed to save quiz score.' });
  }
});

/**
 * GET /api/lessons
 * Returns the list of all generated lessons with their details and scores.
 */
app.get('/api/lessons', (req, res) => {
  try {
    const history = getHistory();
    return res.json(history);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve lessons history.' });
  }
});

/**
 * GET /api/lessons/:id/details
 * Retrieves complete metadata and quiz questions for a lesson.
 */
app.get('/api/lessons/:id/details', (req, res) => {
  const { id } = req.params;
  const metadataPath = path.join(process.cwd(), 'public', 'lessons', id, 'metadata.json');

  if (!fs.existsSync(metadataPath)) {
    return res.status(404).json({ error: 'Lesson not found.' });
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    return res.json(metadata);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to read lesson details.' });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`==============================================================================`);
  console.log(`LumiLearn Backend Express Server running on: http://localhost:${PORT}`);
  console.log(`==============================================================================`);
});
