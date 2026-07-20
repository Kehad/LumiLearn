import { exec } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Gets the duration of an audio file in seconds by parsing ffmpeg output.
 */
export function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    if (!ffmpegPath) {
      return resolve(5.0);
    }
    
    exec(`"${ffmpegPath}" -i "${filePath}"`, (err, stdout, stderr) => {
      // ffmpeg exits with code 1 when no output file is specified, which is normal.
      const match = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        const centiseconds = parseInt(match[4], 10);
        const duration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
        resolve(duration);
      } else {
        resolve(5.0); // fallback duration
      }
    });
  });
}

/**
 * Combines an image and an audio file into a single MP4 video clip.
 */
export function createSceneVideo(imagePath: string, audioPath: string, outputPath: string, duration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      return reject(new Error('ffmpeg binary not found'));
    }

    // Force output formatting to h264/yuv420p which is highly compatible with web browsers
    const cmd = `"${ffmpegPath}" -loop 1 -i "${imagePath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -t ${duration.toFixed(3)} -y "${outputPath}"`;
    
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

/**
 * Concatenates multiple MP4 video files into a single output video.
 */
export function concatVideos(videoPaths: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      return reject(new Error('ffmpeg binary not found'));
    }

    const tempDir = path.dirname(outputPath);
    const listFilePath = path.join(tempDir, `concat_list_${Date.now()}.txt`);
    
    // Create the text file for ffmpeg concat filter. Paths need to use forward slashes on Windows
    const listContent = videoPaths
      .map(p => `file '${p.replace(/\\/g, '/')}'`)
      .join('\n');
      
    try {
      fs.writeFileSync(listFilePath, listContent, 'utf8');
    } catch (e) {
      return reject(e);
    }

    const cmd = `"${ffmpegPath}" -f concat -safe 0 -i "${listFilePath}" -c copy -y "${outputPath}"`;
    
    exec(cmd, (err, stdout, stderr) => {
      // Clean up the list file
      try {
        fs.unlinkSync(listFilePath);
      } catch (e) {
        // ignore cleanup error
      }

      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}
