import { NextRequest, NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/plugin/config';
import { getUserByEmail, createUser, getUserAppBySlugAndAppId, createUserApp } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { token, hostDomain } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token 是必需的' },
        { status: 400 }
      );
    }

    // JWT 验证（包含签名验证）
    try {
      const [header, payload, signature] = token.split('.');
      if (!header || !payload || !signature) {
        throw new Error('Invalid token format');
      }

      // 解码 payload
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
      
      // 检查是否过期
      if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
        return NextResponse.json(
          { error: 'Token 已过期' },
          { status: 401 }
        );
      }

      // 获取应用配置（用于验证签名）
      const appConfig = getAppConfig(decodedPayload.appId);
      if (!appConfig) {
        return NextResponse.json(
          { error: '无效的应用ID' },
          { status: 401 }
        );
      }

      // 验证 JWT 签名
      const expectedSignature = crypto
        .createHmac('sha256', appConfig.secret)
        .update(`${header}.${payload}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        console.error('JWT签名验证失败:', {
          expected: expectedSignature,
          received: signature,
          appId: decodedPayload.appId
        });
        return NextResponse.json(
          { error: 'Token 签名无效' },
          { status: 401 }
        );
      }

      // 获取宿主域名
      let finalHostDomain = null;
      
      if (hostDomain) {
        finalHostDomain = hostDomain;
        console.log('从请求参数获取宿主域名:', finalHostDomain);
      }
      
      if (!finalHostDomain) {
        const referrer = request.headers.get('referer');
        if (referrer) {
          try {
            const referrerUrl = new URL(referrer);
            finalHostDomain = `${referrerUrl.protocol}//${referrerUrl.host}`;
            console.log('从 referer 获取域名:', finalHostDomain);
          } catch (e) {
            console.warn('解析 referer 失败:', e);
          }
        }
      }
      
      if (!finalHostDomain) {
        const origin = request.headers.get('origin');
        if (origin) {
          finalHostDomain = origin;
          console.log('从 origin 获取域名:', finalHostDomain);
        }
      }

      if (!finalHostDomain) {
        console.error('无法获取宿主域名信息:', {
          providedHostDomain: hostDomain,
          referer: request.headers.get('referer'),
          origin: request.headers.get('origin')
        });
        return NextResponse.json(
          { error: '缺少宿主域名信息' },
          { status: 403 }
        );
      }
      
      // 使用应用配置中的域名列表进行校验
      interface DomainMatchConfig {
        allowedDomains: string[];
      }

      interface DomainCheckResult {
        isAllowed: boolean;
      }

      const isAllowed: boolean = appConfig.allowedDomains.some((allowedDomain: string): boolean => {
        if (allowedDomain === finalHostDomain) {
          return true;
        }
        
        if (allowedDomain.startsWith('*.')) {
          const baseDomain: string = allowedDomain.substring(2);
          try {
            const domainUrl: URL = new URL(finalHostDomain);
            return domainUrl.hostname.endsWith(baseDomain);
          } catch (e: unknown) {
            return false;
          }
        }
        
        return false;
      });

      if (!isAllowed) {
        console.warn(`域名未授权: ${finalHostDomain}, 应用: ${decodedPayload.appId}, 允许域名: ${appConfig.allowedDomains.join(', ')}`);
        return NextResponse.json(
          { 
            error: '域名未授权',
            details: `当前域名 ${finalHostDomain} 不在应用 ${decodedPayload.appId} 的允许域名列表中`
          },
          { status: 403 }
        );
      }

      // Token 验证成功，处理用户注册和 User_App 记录
      let userId = null;
      
      if (decodedPayload.userId) {
        try {
          // 1. 检查 User_App 表中是否存在该记录
          const existingUserApp = await getUserAppBySlugAndAppId(
            decodedPayload.userId, 
            decodedPayload.appId
          );

          if (existingUserApp) {
            // 记录已存在，直接使用
            userId = existingUserApp.userId;
            console.log('找到现有 User_App 记录:', { userId, slug: decodedPayload.userId, appId: decodedPayload.appId });
          } else {
            // 2. 记录不存在，需要创建用户和 User_App 记录
            const email = `${decodedPayload.appId}.${decodedPayload.userId}@ai.app`;
            
            // 检查用户是否已存在
            let user = await getUserByEmail(email);
            
            if (!user) {
              // 创建新用户
              console.log('创建新用户:', email);
              await createUser(email, generateUUID()); // 使用随机密码
              user = await getUserByEmail(email);
            }

            if (user) {
              userId = user.id;
              
              // 创建 User_App 记录
              console.log('创建 User_App 记录:', {
                userId: user.id,
                slug: decodedPayload.userId,
                appId: decodedPayload.appId
              });
              
              await createUserApp({
                userId: user.id,
                slug: decodedPayload.userId,
                appId: decodedPayload.appId
              });
            }
          }
        } catch (dbError) {
          console.error('数据库操作失败:', dbError);
          // 不因为数据库错误而阻止验证成功，继续返回验证结果
        }
      }

      // 记录成功的验证信息
      console.log('Token 验证成功:', {
        appId: decodedPayload.appId,
        hostDomain: finalHostDomain,
        userId: decodedPayload.userId,
        dbUserId: userId
      });

      return NextResponse.json({
        valid: true,
        data: {
          appId: decodedPayload.appId,
          userId: decodedPayload.userId,
          dbUserId: userId,
          currentDomain: finalHostDomain,
          allowedDomains: appConfig.allowedDomains
        }
      });

    } catch (jwtError) {
      console.error('JWT解码或验证错误:', jwtError);
      return NextResponse.json(
        { error: 'Token 无效或已被篡改' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Token 验证错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}