import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_UPLOADS_DIR = path.resolve(__dirname, '../uploads');

// Ensure local upload directory exists in development
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}

export class StorageDriver {
  async save({ buffer, originalName, mimeType }) {
    throw new Error('Not implemented');
  }
  async getReadStream(key) {
    throw new Error('Not implemented');
  }
  async delete(key) {
    throw new Error('Not implemented');
  }
}

/**
 * Local Disk Driver (For local development and testing)
 * Stores files with randomized UUID keys in server/uploads (excluded in .gitignore)
 */
export class LocalDiskStorageDriver extends StorageDriver {
  constructor(uploadDir = LOCAL_UPLOADS_DIR) {
    super();
    this.uploadDir = uploadDir;
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async save({ buffer, originalName, mimeType }) {
    const ext = path.extname(originalName || '').toLowerCase() || '.jpg';
    const key = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(this.uploadDir, key);

    await fs.promises.writeFile(filePath, buffer);
    return {
      key,
      storageProvider: 'local',
      size: buffer.length,
      mimeType,
      createdAt: new Date()
    };
  }

  async getReadStream(key) {
    // Sanitize key to prevent path traversal
    const safeKey = path.basename(key);
    const filePath = path.join(this.uploadDir, safeKey);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    return fs.createReadStream(filePath);
  }

  async delete(key) {
    const safeKey = path.basename(key);
    const filePath = path.join(this.uploadDir, safeKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

/**
 * AWS S3 Storage Driver (For cloud production deployments)
 * Requires S3_BUCKET_NAME and AWS credentials configured in production.
 * Supports injected s3Client for unit testing and graceful cloud execution.
 */
export class S3StorageDriver extends StorageDriver {
  constructor(options = {}) {
    super();
    this.bucketName = options.bucketName || process.env.S3_BUCKET_NAME;
    this.region = options.region || process.env.AWS_REGION || 'us-east-1';
    this.s3Client = options.s3Client || null;
    
    if (!this.bucketName) {
      throw new Error(
        'FATAL CONFIGURATION ERROR: S3 storage driver requires S3_BUCKET_NAME environment variable in production.'
      );
    }
  }

  async getClient() {
    if (this.s3Client) return this.s3Client;
    try {
      // Dynamic import to avoid hard bundling requirements in local testing
      const { S3Client } = await import('@aws-sdk/client-s3');
      this.s3Client = new S3Client({ region: this.region });
      return this.s3Client;
    } catch (err) {
      throw new Error(`AWS S3 SDK client initialization failed: ${err.message}. Ensure @aws-sdk/client-s3 is installed or valid IAM credentials are provided.`);
    }
  }

  async save({ buffer, originalName, mimeType }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('Invalid upload payload: binary buffer is required');
    }
    const ext = path.extname(originalName || '').toLowerCase() || '.jpg';
    const key = `reports/${crypto.randomUUID()}${ext}`;

    const client = await this.getClient();
    
    // Support mock client or official PutObjectCommand
    if (typeof client.send === 'function') {
      try {
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        await client.send(new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType || 'image/jpeg'
        }));
      } catch (importErr) {
        // Fallback for mock environments without @aws-sdk/client-s3 installed
        await client.send({
          input: {
            Bucket: this.bucketName,
            Key: key,
            Body: buffer,
            ContentType: mimeType || 'image/jpeg'
          }
        });
      }
    } else if (typeof client.putObject === 'function') {
      await client.putObject({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType
      });
    } else {
      throw new Error('S3 client does not implement standard send/putObject interface');
    }

    return {
      key,
      storageProvider: 's3',
      bucket: this.bucketName,
      size: buffer.length,
      mimeType,
      createdAt: new Date()
    };
  }

  async getReadStream(key) {
    if (!key) throw new Error('Photo key is required');
    // Prevent malicious path traversal keys
    const sanitizedKey = key.replace(/\.\./g, '');

    const client = await this.getClient();
    if (typeof client.send === 'function') {
      try {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const response = await client.send(new GetObjectCommand({
          Bucket: this.bucketName,
          Key: sanitizedKey
        }));
        return response.Body;
      } catch (importErr) {
        const response = await client.send({
          input: {
            Bucket: this.bucketName,
            Key: sanitizedKey
          }
        });
        return response.Body;
      }
    } else if (typeof client.getObject === 'function') {
      const response = await client.getObject({
        Bucket: this.bucketName,
        Key: sanitizedKey
      });
      return response.Body;
    } else {
      throw new Error('S3 client does not implement standard send/getObject interface');
    }
  }

  async delete(key) {
    if (!key) return;
    const sanitizedKey = key.replace(/\.\./g, '');
    const client = await this.getClient();
    if (typeof client.send === 'function') {
      try {
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        await client.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: sanitizedKey
        }));
      } catch (importErr) {
        await client.send({
          isDelete: true,
          input: {
            Bucket: this.bucketName,
            Key: sanitizedKey
          }
        });
      }
    } else if (typeof client.deleteObject === 'function') {
      await client.deleteObject({
        Bucket: this.bucketName,
        Key: sanitizedKey
      });
    }
  }
}

/**
 * Factory to retrieve active storage driver based on environment.
 * In production (NODE_ENV=production or STORAGE_DRIVER=s3), durable S3 storage is strictly required.
 * Local-disk uploads cannot be used in production.
 */
export function getStorageDriver() {
  const isProduction = process.env.NODE_ENV === 'production';
  const driverType = (process.env.STORAGE_DRIVER || (isProduction ? 's3' : 'local')).toLowerCase();

  if (isProduction) {
    if (driverType !== 's3') {
      throw new Error(
        'FATAL PRODUCTION CONFIGURATION ERROR: Ephemeral local-disk storage is strictly prohibited in production on AWS App Runner. STORAGE_DRIVER must be set to "s3" with a valid S3_BUCKET_NAME.'
      );
    }
    return new S3StorageDriver();
  }

  if (driverType === 's3') {
    return new S3StorageDriver();
  }

  return new LocalDiskStorageDriver();
}
