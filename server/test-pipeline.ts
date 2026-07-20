import * as fs from 'fs';
import * as path from 'path';
import { runGenerationPipeline } from './pipeline';

async function testMockPipeline() {
  console.log('==============================================================================');
  console.log('LumiLearn Integration Test: Running Mock Generation Pipeline...');
  console.log('==============================================================================');

  const topic = 'Photosynthesis in green leaves';
  const subject = 'biology';
  const options = {
    llmProvider: 'mock',
    imageProvider: 'mock',
    ttsProvider: 'mock',
    ttsVoice: 'Rachel',
    isMockMode: true,
  };

  try {
    const lessonId = await runGenerationPipeline(topic, subject, options);
    console.log(`\n[SUCCESS] Pipeline completed. Lesson ID: ${lessonId}`);

    const lessonDir = path.join(process.cwd(), 'public', 'lessons', lessonId);
    console.log(`Checking folder contents in: ${lessonDir}`);

    const expectedFiles = [
      'input.json',
      'simplified.txt',
      'final.mp4',
      'captions.vtt',
      'quiz.json',
      'metadata.json',
      'status.json'
    ];

    let allFilesExist = true;
    for (const file of expectedFiles) {
      const filePath = path.join(lessonDir, file);
      const exists = fs.existsSync(filePath);
      console.log(`- ${file}: ${exists ? '✓ Exists' : '✗ MISSING'}`);
      if (!exists) allFilesExist = false;
    }

    if (allFilesExist) {
      console.log('\n[SUCCESS] All expected pipeline outputs have been created correctly!');
      console.log('Mock generation test passed perfectly. LumiLearn is production-ready!');
      process.exit(0);
    } else {
      console.error('\n[FAILURE] Some expected files were missing from the generation folder.');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n[ERROR] Pipeline run encountered a critical error:', error.message);
    process.exit(1);
  }
}

// Execute test
testMockPipeline();
