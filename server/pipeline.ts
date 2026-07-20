import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { createSceneVideo, concatVideos, getAudioDuration } from './ffmpeg';
import { uploadFileToB2 } from './b2';
import { Scene, QuizQuestion, LessonMetadata, PipelineStatus, HistoryEntry } from '../src/types';

// Curated stock educational illustrations for mock mode
const SUBJECT_MOCK_IMAGES: Record<string, string[]> = {
  biology: [
    'https://picsum.photos/800/600?random=10',
    'https://picsum.photos/800/600?random=11',
    'https://picsum.photos/800/600?random=12',
    'https://picsum.photos/800/600?random=13',
  ],
  chemistry: [
    'https://picsum.photos/800/600?random=20',
    'https://picsum.photos/800/600?random=21',
    'https://picsum.photos/800/600?random=22',
    'https://picsum.photos/800/600?random=23',
  ],
  physics: [
    'https://picsum.photos/800/600?random=30',
    'https://picsum.photos/800/600?random=31',
    'https://picsum.photos/800/600?random=32',
    'https://picsum.photos/800/600?random=33',
  ],
  mathematics: [
    'https://picsum.photos/800/600?random=40',
    'https://picsum.photos/800/600?random=41',
    'https://picsum.photos/800/600?random=42',
    'https://picsum.photos/800/600?random=43',
  ],
  default: [
    'https://picsum.photos/800/600?random=50',
    'https://picsum.photos/800/600?random=51',
    'https://picsum.photos/800/600?random=52',
    'https://picsum.photos/800/600?random=53',
  ]
};

// ------------------------------------------------------------------------------
// Status Update Helper
// ------------------------------------------------------------------------------
function updateStatus(lessonId: string, updates: Partial<PipelineStatus>) {
  const lessonDir = path.join(process.cwd(), 'public', 'lessons', lessonId);
  if (!fs.existsSync(lessonDir)) {
    fs.mkdirSync(lessonDir, { recursive: true });
  }

  const statusPath = path.join(lessonDir, 'status.json');
  let currentStatus: PipelineStatus = {
    lessonId,
    status: 'pending',
    step: 0,
    stepName: 'Initialized',
    progress: 0,
    error: null
  };

  if (fs.existsSync(statusPath)) {
    try {
      currentStatus = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    } catch (e) {
      // ignore
    }
  }

  const newStatus = { ...currentStatus, ...updates };
  fs.writeFileSync(statusPath, JSON.stringify(newStatus, null, 2), 'utf8');
}

// ------------------------------------------------------------------------------
// Helper: Download file from URL with robust browser headers and fail-safes
// ------------------------------------------------------------------------------
async function downloadFile(url: string, destPath: string): Promise<void> {
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
  
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buffer);
  } catch (error: any) {
    console.warn(`[Download Warning] Failed to fetch ${url} (${error.message}). Trying fallback Picsum placeholder...`);
    
    // Fallback URL which is guaranteed to serve a valid image
    const fallbackUrl = 'https://picsum.photos/800/600';
    try {
      const fallbackResponse = await fetch(fallbackUrl, { headers });
      if (!fallbackResponse.ok) {
        throw new Error(`Fallback returned HTTP ${fallbackResponse.status}`);
      }
      const buffer = Buffer.from(await fallbackResponse.arrayBuffer());
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, buffer);
    } catch (fallbackError: any) {
      console.error('[Download Error] All image downloads failed. Offline or networking issue:', fallbackError.message);
      throw fallbackError;
    }
  }
}

// ------------------------------------------------------------------------------
// Main Pipeline Execution
// ------------------------------------------------------------------------------
export async function runGenerationPipeline(
  topic: string,
  subject: string,
  options: {
    llmProvider: string;
    imageProvider: string;
    ttsProvider: string;
    ttsVoice: string;
    isMockMode: boolean;
  }
): Promise<string> {
  const lessonId = uuidv4();
  const startTime = Date.now();
  const provenanceSteps: LessonMetadata['provenance']['steps'] = [];

  const lessonDir = path.join(process.cwd(), 'public', 'lessons', lessonId);
  fs.mkdirSync(lessonDir, { recursive: true });

  // Save the initial input.json
  const inputData = { topic, subject, timestamp: new Date().toISOString() };
  fs.writeFileSync(path.join(lessonDir, 'input.json'), JSON.stringify(inputData, null, 2));

  // Determine actual Mock vs Live based on key availability
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const useLiveLLM = !options.isMockMode && (hasGemini || hasOpenAI);

  updateStatus(lessonId, {
    status: 'processing',
    step: 1,
    stepName: 'Step 1: Simplifying content & creating storyboard...',
    progress: 10,
  });

  let title = topic;
  let simplifiedScript = '';
  let scenes: Scene[] = [];
  let quiz: QuizQuestion[] = [];
  let actualLLMUsed = 'mock';

  const step1Start = Date.now();

  try {
    if (useLiveLLM) {
      const llmPrompt = `
You are an expert Nigerian secondary school curriculum designer specializing in creating accessible learning content for mixed-ability classrooms.
Simplify the following topic or textbook passage: "${topic}" (Subject: ${subject}).
Goal: Rewrite it at a controlled reading level (suitable for a student with basic English literacy, aged 12-16) explaining key terms simply.

Break this topic down into a sequence of exactly 4 to 6 logical scenes.
For each scene, you must generate:
1. A short narration line: 1 or 2 sentences maximum. Keep it very slow-paced, clear, and easy to follow. Each scene's narration MUST be less than 150 characters (for timing and voice pacing).
2. A detailed visual storyboard image prompt: A friendly, premium educational illustration style (e.g. "digital flat vector illustration, colorful, friendly, clear subject diagram, classroom-safe, white background").

Also, generate a quiz of exactly 3 multiple-choice questions based on this content. Each question must have:
- 4 choices (A, B, C, D)
- A clear answer key (A, B, C, or D)
- An explanation explaining in simple words why that choice is correct.

You MUST respond strictly with a JSON object in this exact format:
{
  "title": "Title of the lesson",
  "scenes": [
    { "sceneNumber": 1, "narration": "Narration sentence here.", "imagePrompt": "Description of illustration here." }
  ],
  "quiz": [
    { "question": "Question text?", "options": ["Option A text", "Option B text", "Option C text", "Option D text"], "correctAnswer": "A", "explanation": "Simple explanation." }
  ]
}
`;

      if (hasGemini && options.llmProvider === 'gemini') {
        actualLLMUsed = 'gemini (gemini-1.5-flash)';
        const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: "application/json" } });
        const result = await model.generateContent(llmPrompt);
        const text = result.response.text();
        const data = JSON.parse(text);
        title = data.title;
        scenes = data.scenes;
        quiz = data.quiz;
      } else {
        actualLLMUsed = 'openai (gpt-4o-mini)';
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: llmPrompt }],
          response_format: { type: 'json_object' }
        });
        const data = JSON.parse(response.choices[0].message.content || '{}');
        title = data.title;
        scenes = data.scenes;
        quiz = data.quiz;
      }

      // Format simplified text for file
      simplifiedScript = scenes.map(s => `Scene ${s.sceneNumber}:\n${s.narration}\n`).join('\n');
    } else {
      // Mock Mode Simplifier
      actualLLMUsed = 'mock (local rule-based generator)';
      title = topic.charAt(0).toUpperCase() + topic.slice(1);
      
      // curated standard topics
      const normalizedTopic = topic.toLowerCase();
      if (normalizedTopic.includes('photo') || normalizedTopic.includes('plant')) {
        title = "Photosynthesis: How Plants Make Food";
        scenes = [
          { sceneNumber: 1, narration: "All living things need food to grow. While animals find food, plants make their own using sunlight.", imagePrompt: "Vibrant vector of a smiling green plant absorbing warm yellow rays from the sun." },
          { sceneNumber: 2, narration: "Inside plant leaves, there is a green pigment called chlorophyll. It acts like a solar panel to capture light.", imagePrompt: "Microscopic flat illustration of plant cells showing green circles representing chlorophyll." },
          { sceneNumber: 3, narration: "Plants also absorb water from the soil through roots, and pull in carbon dioxide gas from the air.", imagePrompt: "Cross-section diagram of a tree showing roots drinking blue water drops from dark soil." },
          { sceneNumber: 4, narration: "Sunlight splits water and gas into glucose sugar for food, and releases clean oxygen for us to breathe.", imagePrompt: "Happy child breathing clean air next to a large tree, showing oxygen bubbles rising." }
        ];
        quiz = [
          { question: "What do plants use to capture sunlight?", options: ["Chlorophyll", "Roots", "Stems", "Oxygen"], correctAnswer: "A", explanation: "Chlorophyll is the green pigment in leaves that absorbs sunlight like a solar panel." },
          { question: "What gas do plants release for humans to breathe?", options: ["Carbon dioxide", "Oxygen", "Nitrogen", "Helium"], correctAnswer: "B", explanation: "During photosynthesis, plants release oxygen, which humans and animals need to breathe." },
          { question: "Where do plants get water from?", options: ["The air", "The clouds", "The soil through roots", "The sun"], correctAnswer: "C", explanation: "Plants absorb water and nutrients from the soil using their roots." }
        ];
      } else if (normalizedTopic.includes('water') || normalizedTopic.includes('rain') || normalizedTopic.includes('cycle')) {
        title = "The Water Cycle: Earth's Recycling System";
        scenes = [
          { sceneNumber: 1, narration: "The water on Earth is millions of years old. It is constantly recycling in a loop called the water cycle.", imagePrompt: "Scenic flat graphic of a blue ocean, green mountains, and fluffy white clouds." },
          { sceneNumber: 2, narration: "First, the hot sun warms the water in oceans and lakes. The water turns into invisible steam and rises.", imagePrompt: "Warm golden sun beams shining down on a blue lake with curly steam lines rising." },
          { sceneNumber: 3, narration: "High in the cold sky, this steam cools down and gathers together to form soft white clouds.", imagePrompt: "Fluffy white clouds forming in a cool blue sky with blue water droplets gathering." },
          { sceneNumber: 4, narration: "When clouds get too heavy, they release the water as rain or snow, returning water back to the Earth.", imagePrompt: "Dark rain clouds pouring down droplets onto a dry green forest and replenishing a river." }
        ];
        quiz = [
          { question: "What heats up the water in lakes and oceans?", options: ["The wind", "The sun", "Earth's core", "Volcanoes"], correctAnswer: "B", explanation: "The sun's heat warms water on the surface, causing it to evaporate." },
          { question: "What are clouds made of?", options: ["Cotton candy", "Smoke", "Invisible steam cooling into water droplets", "Space dust"], correctAnswer: "C", explanation: "Clouds form when rising water vapor (steam) cools and condenses back into liquid water droplets." },
          { question: "What is it called when rain falls from heavy clouds?", options: ["Evaporation", "Condensation", "Precipitation (Rain)", "Freezing"], correctAnswer: "C", explanation: "Rain, snow, or sleet falling from the clouds back to Earth is called precipitation." }
        ];
      } else {
        // generic fallback
        title = `Introduction to ${title}`;
        scenes = [
          { sceneNumber: 1, narration: `Let's learn about ${topic}. This concept helps us understand how the world around us operates.`, imagePrompt: `A flat graphic representing ${topic} showing a student studying with textbooks.` },
          { sceneNumber: 2, narration: `Every big idea can be broken down into simpler parts. We look at the core principles first.`, imagePrompt: `A step-by-step diagram breaking a complex idea into glowing, colored circles.` },
          { sceneNumber: 3, narration: `In Nigeria, secondary schools study these ideas to prepare students for WAEC examinations.`, imagePrompt: `A neat vector illustration of Nigerian students wearing uniforms writing on an exam paper.` },
          { sceneNumber: 4, narration: `By understanding this topic, you gain skills to solve real-world problems in your community.`, imagePrompt: `A happy young graduate smiling in front of a modern science school building.` }
        ];
        quiz = [
          { question: `What is the main focus of this lesson?`, options: [`Understanding ${topic}`, `Memorizing dates`, `Learning a new language`, `Drawing pictures`], correctAnswer: "A", explanation: `This lesson simplifies the concepts of ${topic} to help you understand it easily.` },
          { question: `Why do we break topics into smaller scenes?`, options: [`To make them harder`, `To make learning slow and clear`, `To write longer scripts`, `To use more paper`], correctAnswer: "B", explanation: `Breaking topics into visual chunks helps our brains process reading materials without stress.` },
          { question: `Which examination does this study help you prepare for?`, options: [`TOEFL`, `SAT`, `WAEC / School Exams`, `Driving Test`], correctAnswer: "C", explanation: `LumiLearn matches your school's taxonomy to help you review topics tested in WAEC and local exams.` }
        ];
      }
      simplifiedScript = scenes.map(s => `Scene ${s.sceneNumber}:\n${s.narration}\n`).join('\n');
    }

    // Write simplified script file
    fs.writeFileSync(path.join(lessonDir, 'simplified.txt'), simplifiedScript);

    provenanceSteps.push({
      name: 'Simplify & Storyboard',
      provider: useLiveLLM ? options.llmProvider : 'mock',
      modelOrVoice: actualLLMUsed,
      durationMs: Date.now() - step1Start,
      cost: useLiveLLM ? 0.0015 : 0.00,
      retries: 0,
      status: 'success'
    });
  } catch (error: any) {
    updateStatus(lessonId, { status: 'failed', error: `Step 1 failed: ${error.message}` });
    throw error;
  }

  // ------------------------------------------------------------------------------
  // Step 2 & 3: Image Generation
  // ------------------------------------------------------------------------------
  updateStatus(lessonId, {
    step: 3,
    stepName: 'Step 2: Generating educational illustrations per scene...',
    progress: 25,
  });

  const step2Start = Date.now();
  const imageProvider = !options.isMockMode && process.env.OPENAI_API_KEY ? options.imageProvider : 'mock';
  let imageCost = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneDir = path.join(lessonDir, 'scenes', `scene_${scene.sceneNumber}`);
    fs.mkdirSync(sceneDir, { recursive: true });

    updateStatus(lessonId, {
      stepName: `Step 2: Generating scene ${scene.sceneNumber} of ${scenes.length} illustration...`,
      progress: 25 + Math.round((i / scenes.length) * 20),
    });

    const imagePath = path.join(sceneDir, 'image.png');
    scene.imageProvider = imageProvider;

    try {
      if (imageProvider === 'openai' && process.env.OPENAI_API_KEY) {
        scene.imageModel = 'dall-e-3';
        scene.imageCost = 0.04; 
        imageCost += 0.04;
        
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: scene.imagePrompt,
          n: 1,
          size: '1024x1024',
        });
        const url = response.data[0].url;
        if (url) {
          await downloadFile(url, imagePath);
        } else {
          throw new Error('DALL-E returned empty URL');
        }
      } else if (imageProvider === 'replicate' && process.env.REPLICATE_API_KEY) {
        scene.imageModel = 'stability-ai/sdxl';
        scene.imageCost = 0.003;
        imageCost += 0.003;

        const response = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: '7762d356171541c625e5b975996172c7a4de9970c025847228b3cbd342e67e1d', // SDXL
            input: {
              prompt: scene.imagePrompt,
              width: 768,
              height: 512,
            }
          })
        });
        
        let prediction = await response.json();
        if (prediction.error) {
          throw new Error(prediction.error);
        }

        // Poll Replicate for completion
        let status = prediction.status;
        while (status !== 'succeeded' && status !== 'failed') {
          await new Promise(r => setTimeout(r, 1500));
          const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
            headers: { 'Authorization': `Token ${process.env.REPLICATE_API_KEY}` }
          });
          prediction = await pollRes.json();
          status = prediction.status;
        }

        if (status === 'succeeded' && prediction.output?.[0]) {
          await downloadFile(prediction.output[0], imagePath);
        } else {
          throw new Error(`Replicate failed with status: ${status}`);
        }
      } else if (imageProvider === 'gmi' && process.env.GMI_API_KEY) {
        scene.imageModel = 'flux-schnell';
        scene.imageCost = 0.002;
        imageCost += 0.002;

        const response = await fetch('https://api.gmi-serving.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GMI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'flux-schnell',
            prompt: scene.imagePrompt,
            n: 1,
            size: '1024x1024'
          })
        });

        const data = await response.json();
        if (data.data?.[0]?.url) {
          await downloadFile(data.data[0].url, imagePath);
        } else {
          throw new Error('GMI Cloud image API returned empty response');
        }
      } else {
        // Mock Image fallback
        scene.imageModel = 'local-picsum-curated';
        scene.imageCost = 0.00;

        const list = SUBJECT_MOCK_IMAGES[subject.toLowerCase()] || SUBJECT_MOCK_IMAGES.default;
        const imgUrl = list[i % list.length];
        await downloadFile(imgUrl, imagePath);
      }

      // Save scene.json
      const sceneMetadata = {
        sceneNumber: scene.sceneNumber,
        prompt: scene.imagePrompt,
        narration: scene.narration,
        provider: scene.imageProvider,
        model: scene.imageModel,
        timestamp: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(sceneDir, 'scene.json'), JSON.stringify(sceneMetadata, null, 2));

    } catch (e: any) {
      console.warn(`Failed to generate image via ${imageProvider}, falling back to curated stock image...`, e.message);
      // Fallback in case of API failure
      const list = SUBJECT_MOCK_IMAGES[subject.toLowerCase()] || SUBJECT_MOCK_IMAGES.default;
      const imgUrl = list[i % list.length];
      await downloadFile(imgUrl, imagePath);
    }
  }

  provenanceSteps.push({
    name: 'Image Generation',
    provider: imageProvider,
    modelOrVoice: scenes.map(s => s.imageModel || 'mock').join(', '),
    durationMs: Date.now() - step2Start,
    cost: imageCost,
    retries: 0,
    status: 'success'
  });

  // ------------------------------------------------------------------------------
  // Step 4: TTS Narration
  // ------------------------------------------------------------------------------
  updateStatus(lessonId, {
    step: 4,
    stepName: 'Step 3: Creating slow, clear narration audio...',
    progress: 45,
  });

  const step3Start = Date.now();
  const ttsProvider = !options.isMockMode && process.env.ELEVENLABS_API_KEY ? options.ttsProvider : 'mock';
  let ttsCost = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneDir = path.join(lessonDir, 'scenes', `scene_${scene.sceneNumber}`);
    const audioPath = path.join(sceneDir, 'narration.mp3');
    scene.ttsProvider = ttsProvider;

    updateStatus(lessonId, {
      stepName: `Step 3: Narrating scene ${scene.sceneNumber} of ${scenes.length}...`,
      progress: 45 + Math.round((i / scenes.length) * 20),
    });

    try {
      if (ttsProvider === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
        scene.ttsVoice = options.ttsVoice || 'Rachel';
        scene.ttsCost = 0.01;
        ttsCost += 0.01;

        const voiceId = '21m00Tcm4TlvDq8ikWAM'; 
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: scene.narration,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.75,
              similarity_boost: 0.75,
            }
          })
        });

        if (!response.ok) {
          throw new Error(`ElevenLabs error: ${response.statusText}`);
        }
        
        const audioBuffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(audioPath, audioBuffer);
      } else {
        // Free Google Translate TTS fallback
        scene.ttsVoice = 'Google EN-Slow';
        scene.ttsCost = 0.00;

        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(scene.narration)}`;
        await downloadFile(url, audioPath);
      }
      
      // Get audio duration
      scene.duration = await getAudioDuration(audioPath);

    } catch (e: any) {
      console.warn(`TTS generation failed via ${ttsProvider}, falling back to Google Translate TTS...`, e.message);
      // Fallback
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(scene.narration)}`;
      await downloadFile(url, audioPath);
      scene.duration = await getAudioDuration(audioPath);
    }
  }

  provenanceSteps.push({
    name: 'TTS Narration',
    provider: ttsProvider,
    modelOrVoice: scenes.map(s => s.ttsVoice || 'mock').join(', '),
    durationMs: Date.now() - step3Start,
    cost: ttsCost,
    retries: 0,
    status: 'success'
  });

  // ------------------------------------------------------------------------------
  // Step 5: Caption Sync (WebVTT file creation)
  // ------------------------------------------------------------------------------
  updateStatus(lessonId, {
    step: 5,
    stepName: 'Step 4: Synchronizing captions with narration...',
    progress: 65,
  });

  const step5Start = Date.now();
  
  // Build timed captions WebVTT file
  let vttContent = 'WEBVTT\n\n';
  let currentTime = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const duration = scene.duration || 5.0;
    
    const words = scene.narration.split(' ');
    const phraseSize = 3;
    const phrases: string[] = [];
    
    for (let w = 0; w < words.length; w += phraseSize) {
      phrases.push(words.slice(w, w + phraseSize).join(' '));
    }

    const durationPerPhrase = duration / phrases.length;

    for (let p = 0; p < phrases.length; p++) {
      const phrase = phrases[p];
      const start = currentTime;
      const end = currentTime + durationPerPhrase;
      
      vttContent += `${formatVttTime(start)} --> ${formatVttTime(end)}\n${phrase}\n\n`;
      currentTime = end;
    }
  }

  fs.writeFileSync(path.join(lessonDir, 'captions.vtt'), vttContent, 'utf8');

  provenanceSteps.push({
    name: 'Captions Synchronizer',
    provider: 'local',
    modelOrVoice: 'WebVTT Phrase Extractor',
    durationMs: Date.now() - step5Start,
    cost: 0.00,
    retries: 0,
    status: 'success'
  });

  // ------------------------------------------------------------------------------
  // Step 6: Compose MP4 via ffmpeg
  // ------------------------------------------------------------------------------
  updateStatus(lessonId, {
    step: 6,
    stepName: 'Step 5: Stitching scenes into final video...',
    progress: 75,
  });

  const step6Start = Date.now();
  const sceneVideoPaths: string[] = [];

  try {
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneNum = scene.sceneNumber;
      const sceneDir = path.join(lessonDir, 'scenes', `scene_${sceneNum}`);
      const imagePath = path.join(sceneDir, 'image.png');
      const audioPath = path.join(sceneDir, 'narration.mp3');
      const videoPath = path.join(sceneDir, `scene_${sceneNum}.mp4`);

      await createSceneVideo(imagePath, audioPath, videoPath, scene.duration || 5.0);
      sceneVideoPaths.push(videoPath);
    }

    const finalMp4Path = path.join(lessonDir, 'final.mp4');
    await concatVideos(sceneVideoPaths, finalMp4Path);

    for (const v of sceneVideoPaths) {
      try {
        fs.unlinkSync(v);
      } catch (e) {
        // ignore
      }
    }

    provenanceSteps.push({
      name: 'Video Stitching (ffmpeg)',
      provider: 'ffmpeg',
      modelOrVoice: 'H.264 / AAC encoder',
      durationMs: Date.now() - step6Start,
      cost: 0.00,
      retries: 0,
      status: 'success'
    });

  } catch (error: any) {
    updateStatus(lessonId, { status: 'failed', error: `Stitching video failed: ${error.message}` });
    throw error;
  }

  // ------------------------------------------------------------------------------
  // Step 7: Quiz JSON File
  // ------------------------------------------------------------------------------
  updateStatus(lessonId, {
    step: 7,
    stepName: 'Step 6: Writing interactive quiz questions...',
    progress: 85,
  });
  
  fs.writeFileSync(path.join(lessonDir, 'quiz.json'), JSON.stringify(quiz, null, 2), 'utf8');

  // ------------------------------------------------------------------------------
  // Step 8: Upload to Backblaze B2 & Provenance metadata
  // ------------------------------------------------------------------------------
  updateStatus(lessonId, {
    step: 8,
    stepName: 'Step 7: Uploading to durable Backblaze B2 storage...',
    progress: 90,
  });

  const step8Start = Date.now();
  const b2Config = !!process.env.B2_APPLICATION_KEY;
  const b2Urls: LessonMetadata['provenance']['b2Urls'] = {};
  
  if (b2Config) {
    try {
      const videoUrl = await uploadFileToB2(path.join(lessonDir, 'final.mp4'), `lessons/${lessonId}/final.mp4`);
      if (videoUrl) b2Urls.video = videoUrl;

      const captionsUrl = await uploadFileToB2(path.join(lessonDir, 'captions.vtt'), `lessons/${lessonId}/captions.vtt`);
      if (captionsUrl) b2Urls.captions = captionsUrl;

      const quizUrl = await uploadFileToB2(path.join(lessonDir, 'quiz.json'), `lessons/${lessonId}/quiz.json`);
      if (quizUrl) b2Urls.quiz = quizUrl;
    } catch (e: any) {
      console.error('B2 upload failed, falling back to local paths:', e.message);
    }
  }

  provenanceSteps.push({
    name: 'Storage Upload',
    provider: b2Config ? 'backblaze' : 'local',
    modelOrVoice: b2Config ? 'B2 Cloud Storage' : 'Local Disk',
    durationMs: Date.now() - step8Start,
    cost: 0.00,
    retries: 0,
    status: 'success'
  });

  const totalCost = provenanceSteps.reduce((acc, s) => acc + s.cost, 0);
  const totalDuration = Date.now() - startTime;

  const metadata: LessonMetadata = {
    lessonId,
    title,
    topic,
    subject,
    timestamp: new Date().toISOString(),
    simplifiedScript,
    scenes,
    quiz,
    providers: {
      llm: useLiveLLM ? options.llmProvider : 'mock',
      image: imageProvider,
      tts: ttsProvider,
    },
    provenance: {
      steps: provenanceSteps,
      totalCost,
      totalDurationMs: totalDuration,
      b2Uploaded: b2Config && Object.keys(b2Urls).length > 0,
      b2Urls: b2Config ? b2Urls : undefined,
    }
  };

  fs.writeFileSync(path.join(lessonDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

  if (b2Config && Object.keys(b2Urls).length > 0) {
    try {
      const metadataUrl = await uploadFileToB2(path.join(lessonDir, 'metadata.json'), `lessons/${lessonId}/metadata.json`);
      if (metadataUrl) b2Urls.metadata = metadataUrl;
      metadata.provenance.b2Urls = b2Urls;
      fs.writeFileSync(path.join(lessonDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
    } catch (e) {
      // ignore
    }
  }

  appendLessonToHistory({
    lessonId,
    title,
    topic,
    subject,
    timestamp: metadata.timestamp,
    thumbnailUrl: `/lessons/${lessonId}/scenes/scene_1/image.png`,
    quizScore: null
  });

  updateStatus(lessonId, {
    status: 'completed',
    stepName: 'Lesson generated successfully!',
    progress: 100,
  });

  return lessonId;
}

// ------------------------------------------------------------------------------
// Time Formatter for VTT (HH:MM:SS.mmm)
// ------------------------------------------------------------------------------
function formatVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const pad = (num: number, size: number) => num.toString().padStart(size, '0');

  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}.${pad(ms, 3)}`;
}

// ------------------------------------------------------------------------------
// Central Lessons History Manager
// ------------------------------------------------------------------------------
const historyFilePath = path.join(process.cwd(), 'public', 'lessons', 'history.json');

export function getHistory(): HistoryEntry[] {
  fs.mkdirSync(path.dirname(historyFilePath), { recursive: true });
  if (!fs.existsSync(historyFilePath)) {
    fs.writeFileSync(historyFilePath, JSON.stringify([], null, 2), 'utf8');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(historyFilePath, 'utf8'));
  } catch (e) {
    return [];
  }
}

export function appendLessonToHistory(entry: HistoryEntry) {
  const history = getHistory();
  const index = history.findIndex(h => h.lessonId === entry.lessonId);
  if (index >= 0) {
    history[index] = { ...history[index], ...entry };
  } else {
    history.unshift(entry);
  }
  fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
}

export function updateQuizScoreInHistory(lessonId: string, score: number) {
  const history = getHistory();
  const index = history.findIndex(h => h.lessonId === lessonId);
  if (index >= 0) {
    history[index].quizScore = score;
    fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
  }
}
