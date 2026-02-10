
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
    private s3Client: S3Client;
    private bucketName: string;

    constructor(private configService: ConfigService) {
        const region = this.configService.get<string>('AWS_REGION') ?? '';
        const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '';
        const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '';
        this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME') ?? '';

        if (!region || !accessKeyId || !secretAccessKey || !this.bucketName) {
            console.warn('AWS credentials not fully configured. Uploads may fail.');
        }

        this.s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            // Force path style for better compatibility with some S3 providers if needed
            forcePathStyle: false,
        });
    }

    async uploadFile(file: Express.Multer.File, folder: string = 'uploads'): Promise<{ url: string; key: string }> {
        try {
            const fileExtension = file.originalname.split('.').pop();
            const fileName = `${uuidv4()}.${fileExtension}`;
            const key = `${folder}/${fileName}`;

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                // ACL: 'public-read', // Depends on bucket settings. Better to use bucket policy.
            });

            await this.s3Client.send(command);

            // Construct public URL (assuming public bucket access or CloudFront)
            // If bucket is private, we'd need presigned URLs, but requirement says "upload, download", typically public read for images is easier for MVP.
            const url = `https://${this.bucketName}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/${key}`;

            return { url, key };
        } catch (error) {
            console.error('Error uploading file to S3:', error);
            throw new InternalServerErrorException('Falha ao fazer upload do arquivo');
        }
    }

    async deleteFile(key: string): Promise<void> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });

            await this.s3Client.send(command);
        } catch (error) {
            console.error('Error deleting file from S3:', error);
            // We might not want to throw here if we just want to suppress deletion errors
            throw new InternalServerErrorException('Falha ao deletar arquivo');
        }
    }

    async getSignedDownloadUrl(key: string, filename: string): Promise<string> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                ResponseContentDisposition: `attachment; filename="${filename}"`,
            });

            // Expiration time in seconds (e.g., 15 minutes)
            const url = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
            return url;
        } catch (error) {
            console.error('Error generating signed URL:', error);
            throw new InternalServerErrorException('Falha ao gerar link de download');
        }
    }
}
