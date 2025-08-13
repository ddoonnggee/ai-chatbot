import { NextRequest, NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/plugin/config';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { appId, userId } = await request.json();

    if (!appId) {
      return NextResponse.json(
        { error: '应用ID是必需的' },
        { status: 400 }
      );
    }

    // 获取应用配置
    const appConfig = getAppConfig(appId);
    if (!appConfig) {
      return NextResponse.json(
        { error: '无效的应用ID' },
        { status: 400 }
      );
    }

    // 基于应用配置生成 token
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      appId,
      userId: userId || null,
      allowedDomains: appConfig.allowedDomains, // 包含允许的域名列表
      iat: now,
      exp: now + (24 * 60 * 60) // 24小时后过期
    };

    // 创建 JWT header
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    // Base64URL 编码
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

    // 使用应用的 secret 签名
    const signature = crypto
      .createHmac('sha256', appConfig.secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    const token = `${encodedHeader}.${encodedPayload}.${signature}`;

    return NextResponse.json({
      token,
      payload: {
        appId,
        userId,
        allowedDomains: appConfig.allowedDomains,
        expiresAt: new Date(payload.exp * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('Token 生成错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
