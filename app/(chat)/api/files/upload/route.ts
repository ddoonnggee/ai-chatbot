import { NextResponse } from 'next/server';
import { z } from 'zod';
import COS from 'cos-nodejs-sdk-v5';

import { auth } from '@/app/(auth)/auth';

// 初始化腾讯云 COS
const cos = new COS({
  SecretId: process.env.TENCENT_COS_SECRET_ID!,
  SecretKey: process.env.TENCENT_COS_SECRET_KEY!,
});

const BUCKET = process.env.TENCENT_COS_BUCKET!;
const REGION = process.env.TENCENT_COS_REGION!;

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    // Update the file type based on the kind of files you want to accept
    .refine((file) => ['image/jpeg', 'image/png'].includes(file.type), {
      message: 'File type should be JPEG or PNG',
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get('file') as File).name;
    const fileBuffer = await file.arrayBuffer();

    try {
      // 生成唯一的文件名，避免冲突
      const timestamp = Date.now();
      const fileExtension = filename.split('.').pop();
      const uniqueFilename = `uploads/${timestamp}-${filename}`;

      // 上传到腾讯云 COS
      const result = await new Promise((resolve, reject) => {
        cos.putObject(
          {
            Bucket: BUCKET,
            Region: REGION,
            Key: uniqueFilename,
            Body: Buffer.from(fileBuffer),
            ContentType: file.type,
          },
          (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          },
        );
      });

      // 构造公共访问URL
      const url = `https://${BUCKET}.cos.${REGION}.myqcloud.com/${uniqueFilename}`;

      // 返回与 Vercel Blob 兼容的响应格式
      return NextResponse.json({
        url,
        pathname: uniqueFilename,
        contentType: file.type,
        contentDisposition: `attachment; filename="${filename}"`,
        size: file.size,
      });
    } catch (error) {
      console.error('COS upload error:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
