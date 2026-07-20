export interface Scene {
  sceneNumber: number;
  narration: string;
  imagePrompt: string;
  imageProvider?: string;
  imageModel?: string;
  imageCost?: number;
  ttsProvider?: string;
  ttsVoice?: string;
  ttsCost?: number;
  duration?: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string; // A, B, C, or D
  explanation: string;
}

export interface LessonMetadata {
  lessonId: string;
  title: string;
  topic: string;
  subject: string;
  timestamp: string;
  simplifiedScript: string;
  scenes: Scene[];
  quiz: QuizQuestion[];
  quizScore?: number | null; // saved quiz score
  providers: {
    llm: string;
    image: string;
    tts: string;
  };
  provenance: {
    steps: {
      name: string;
      provider: string;
      modelOrVoice: string;
      durationMs: number;
      cost: number;
      retries: number;
      status: 'success' | 'failed';
    }[];
    totalCost: number;
    totalDurationMs: number;
    b2Uploaded: boolean;
    b2Urls?: {
      video?: string;
      captions?: string;
      metadata?: string;
      quiz?: string;
    };
  };
}

export interface PipelineStatus {
  lessonId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  step: number;
  stepName: string;
  progress: number;
  error: string | null;
}

export interface HistoryEntry {
  lessonId: string;
  title: string;
  topic: string;
  subject: string;
  timestamp: string;
  thumbnailUrl: string;
  quizScore: number | null;
}
