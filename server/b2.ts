import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

export interface B2Config {
  keyId: string;
  applicationKey: string;
  bucketName: string;
  endpointUrl: string;
  region: string;
}

export function getB2Config(): B2Config | null {
  const keyId = process.env.B2_APPLICATION_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;
  const bucketName = process.env.B2_BUCKET_NAME;
  const endpointUrl = process.env.B2_ENDPOINT_URL;
  const region = process.env.B2_REGION || 'us-east-005';

  if (keyId && applicationKey && bucketName && endpointUrl) {
    return { keyId, applicationKey, bucketName, endpointUrl, region };
  }
  return null;
}

/**
 * Uploads a file to Backblaze B2 using the S3-compatible API.
 * Returns the public URL of the uploaded file, or null if B2 is not configured.
 */
export async function uploadFileToB2(filePath: string, b2Path: string): Promise<string | null> {
  const config = getB2Config();
  if (!config) return null;

  try {
    // S3 client configured for Backblaze B2 S3 API
    const s3 = new S3Client({
      endpoint: config.endpointUrl,
      region: config.region,
      credentials: {
        accessKeyId: config.keyId,
        secretAccessKey: config.applicationKey,
      },
    });

    const fileBuffer = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);

    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: b2Path,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3.send(command);

    // Format Backblaze friendly URL
    // Standard friendly URL format: https://<endpoint_host>/file/<bucket_name>/<key>
    // e.g. https://s3.us-east-005.backblazeb2.com -> https://f005.backblazeb2.com/file/my-bucket/lessons/...
    // Let's extract the friendly host from endpoint
    // s3.us-east-005.backblazeb2.com -> f005.backblazeb2.com
    const match = config.endpointUrl.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/);
    if (match) {
      const regionCode = match[1]; // e.g. us-east-005
      // region code like us-east-005 maps to f005
      const serverNum = regionCode.replace('us-east-', '');
      const friendlyHost = `f${serverNum}.backblazeb2.com`;
      return `https://${friendlyHost}/file/${config.bucketName}/${b2Path}`;
    }
    
    // Fallback: standard S3 direct endpoint path
    return `${config.endpointUrl}/${config.bucketName}/${b2Path}`;
  } catch (error) {
    console.error(`B2 Upload Error for ${filePath}:`, error);
    return null;
  }
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.mp4': return 'video/mp4';
    case '.mp3': return 'audio/mp3';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.json': return 'application/json';
    case '.vtt': return 'text/vtt';
    case '.txt': return 'text/plain';
    default: return 'application/octet-stream';
  }
}
