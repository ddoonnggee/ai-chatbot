import { NextRequest, NextResponse } from 'next/server';
import { verifyPluginToken, extractTokenFromHeader } from './jwt';
import { getAppConfig } from './config';

export interface AuthenticatedRequest extends NextRequest {
  pluginAuth?: {
    appId: string;
    domain: string;
    userId?: string;
  };
}

export async function authenticatePluginToken(request: NextRequest) {
  try {
    // 从 Authorization header 或 URL 参数中获取 token
    const authHeader = request.headers.get('authorization');
    const urlToken = request.nextUrl.searchParams.get('token');
    
    const token = extractTokenFromHeader(authHeader) || urlToken;
    
    if (!token) {
      return NextResponse.json(
        { error: '缺少访问令牌' },
        { status: 401 }
      );
    }

    // 解析 token 获取 appId
    let payload;
    let config;
    try {
      // 先尝试解码不验证签名，获取 appId
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const payloadPart = JSON.parse(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      
      if (!payloadPart.appId) {
        throw new Error('Token missing appId');
      }

      // 获取对应的配置
      config = getAppConfig(payloadPart.appId);
      if (!config) {
        throw new Error('Invalid appId');
      }

      // 使用正确的密钥验证 token
      payload = await verifyPluginToken(token, config.secret);
      
    } catch (error) {
      return NextResponse.json(
        { error: '无效的访问令牌' },
        { status: 401 }
      );
    }

    // 验证 referrer 域名
    const referrer = request.headers.get('referer');
    if (referrer && !config.allowedDomains.some(domain => 
      referrer.startsWith(domain)
    )) {
      return NextResponse.json(
        { error: '域名未授权' },
        { status: 403 }
      );
    }

    // 在请求对象上添加认证信息
    (request as AuthenticatedRequest).pluginAuth = {
      appId: payload.appId,
      domain: payload.domain,
      userId: payload.userId
    };

    return null; // 认证成功，返回 null 表示继续处理请求
    
  } catch (error) {
    console.error('Token 验证失败:', error);
    return NextResponse.json(
      { error: '认证失败' },
      { status: 401 }
    );
  }
}
