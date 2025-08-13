import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // 读取 SDK 文件
    const sdkPath = path.join(process.cwd(), 'public', 'ai-chat.js');
    const sdkContent = await readFile(sdkPath, 'utf8');

    return new NextResponse(sdkContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('SDK 文件读取失败:', error);
    return NextResponse.json(
      { error: 'SDK 文件不可用' },
      { status: 404 }
    );
  }
}
