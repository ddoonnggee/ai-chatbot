'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';

// 添加token信息接口
interface TokenInfo {
  appId: string;
  userId?: string;
  domain: string;
  exp?: number;
  iat?: number;
}

function EmbedContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showTokenInfo, setShowTokenInfo] = useState(false);
  const [messages, setMessages] = useState<Array<{id: string, content: string, role: 'user' | 'assistant', timestamp: Date}>>([
    {
      id: '1',
      content: '您好！我是AI助手，很高兴为您服务。请告诉我您需要什么帮助？',
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [hostDomain, setHostDomain] = useState<string>('');
  const [userInfo, setUserInfo] = useState<{userId?: string, dbUserId?: string} | null>(null);

  // 添加token解码函数
  const decodeToken = (tokenString: string): TokenInfo | null => {
    try {
      const [header, payload, signature] = tokenString.split('.');
      if (!header || !payload || !signature) {
        throw new Error('Invalid token format');
      }

      // 解码payload部分
      const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      
      return {
        appId: decodedPayload.appId,
        userId: decodedPayload.userId,
        domain: decodedPayload.domain,
        exp: decodedPayload.exp,
        iat: decodedPayload.iat
      };
    } catch (err) {
      console.error('Token解码失败:', err);
      return null;
    }
  };

  // 获取宿主页面域名
  useEffect(() => {
    // 尝试通过 postMessage 获取宿主域名
    const getHostDomain = () => {
      try {
        // 检查是否在 iframe 中
        if (window.parent && window.parent !== window) {
          // 向父窗口发送消息请求域名信息
          window.parent.postMessage({ type: 'REQUEST_HOST_DOMAIN' }, '*');
          
          // 监听父窗口的回复
          const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'HOST_DOMAIN_RESPONSE') {
              const domain = event.data.domain;
              console.log('从父窗口获取到域名:', domain);
              setHostDomain(domain);
            }
          };
          
          window.addEventListener('message', handleMessage);
          
          // 清理函数
          return () => {
            window.removeEventListener('message', handleMessage);
          };
        } else {
          // 直接访问，使用当前页面的域名
          const currentDomain = `${window.location.protocol}//${window.location.host}`;
          setHostDomain(currentDomain);
          console.log('直接访问，使用当前域名:', currentDomain);
        }
      } catch (error) {
        console.error('获取宿主域名失败:', error);
      }
    };

    getHostDomain();
  }, []);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setError('Token 参数缺失');
      setLoading(false);
      return;
    }

    // 解码token获取信息
    const decodedInfo = decodeToken(tokenParam);
    if (decodedInfo) {
      setTokenInfo(decodedInfo);
    }

    const verifyToken = async () => {
      try {
        const response = await fetch('/api/plugin/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            token: tokenParam,
            hostDomain: hostDomain
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Token 验证失败');
        }

        const result = await response.json();
        setToken(tokenParam);
        setUserInfo({
          userId: result.data.userId,
          dbUserId: result.data.dbUserId
        });
        
        console.log('验证成功，用户信息:', result.data);
        
        // 如果有用户信息，先登录再跳转
        // if (result.data.dbUserId) {
        //   await loginAndRedirect(result.data.dbUserId);
        // } else {
          // 没有用户信息直接跳转
          window.location.href = 'https://ai-chatbot-two-flame.vercel.app';
        // }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Token 验证失败');
        setLoading(false);
      }
    };

    // 等待获取到宿主域名后再验证 token
    if (hostDomain) {
      verifyToken();
    }
  }, [searchParams, hostDomain]);

  // 登录并跳转函数
  const loginAndRedirect = async (userId: string) => {
    try {
      console.log('开始自动登录用户:', userId);
      
      // 方法1：使用NextAuth登录 - 修复参数问题
      const result = await signIn('credentials', {
        id: userId, // 使用id而不是userId
        redirect: false,
        callbackUrl: 'https://ai-chatbot-two-flame.vercel.app'
      });
      
      if (result?.ok && !result.error) {
        console.log('NextAuth登录成功，即将跳转');
        // 短暂延迟确保登录状态同步
        setTimeout(() => {
          window.location.href = 'https://ai-chatbot-two-flame.vercel.app';
        }, 500);
      } else {
        console.warn('NextAuth登录失败，错误信息:', result?.error);
        await tryAlternativeLogin(userId);
      }
      
    } catch (err) {
      console.warn('登录过程异常:', err);
      await tryAlternativeLogin(userId);
    }
  };

  // 备用登录方法
  const tryAlternativeLogin = async (userId: string) => {
    try {
      console.log('尝试备用登录方式');
      
      // 方法2：创建用户会话
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          action: 'create'
        }),
      });

      if (sessionResponse.ok) {
        console.log('会话创建成功');
        setTimeout(() => {
          window.location.href = 'https://ai-chatbot-two-flame.vercel.app';
        }, 500);
        return;
      }

      // 方法3：使用Cookie设置用户ID
      document.cookie = `user-id=${userId}; path=/; max-age=86400; SameSite=Lax`;
      console.log('设置用户Cookie');
      
      setTimeout(() => {
        window.location.href = 'https://ai-chatbot-two-flame.vercel.app';
      }, 500);
      
    } catch (err) {
      console.warn('备用登录失败:', err);
      // 最后手段：通过URL参数传递用户信息
      const targetUrl = `https://ai-chatbot-two-flame.vercel.app?auto_login=${encodeURIComponent(userId)}`;
      console.log('通过URL参数登录:', targetUrl);
      window.location.href = targetUrl;
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user' as const,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');

    // 模拟AI回复
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        content: '感谢您的问题！这是一个演示回复。在实际应用中，这里会连接到您的AI服务。',
        role: 'assistant' as const,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在验证访问权限...</p>
          {userInfo?.userId && (
            <p className="text-sm text-gray-500 mt-2">
              正在登录用户: {userInfo.userId}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-4">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">访问受限</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.close()}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              关闭窗口
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="h-screen flex flex-col">
        <div className="bg-blue-600 text-white p-4 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-lg font-semibold">AI 智能助手</h1>
              <p className="text-blue-100 text-sm">
                您好！我是您的AI助手，有什么可以帮助您的吗？
                {userInfo?.userId && (
                  <span className="block mt-1">
                    欢迎用户: {userInfo.userId}
                    {userInfo.dbUserId && ` (ID: ${userInfo.dbUserId.slice(0, 8)}...)`}
                  </span>
                )}
              </p>
            </div>
            
            {/* Token信息按钮 */}
            <button
              onClick={() => setShowTokenInfo(!showTokenInfo)}
              className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors"
              title="查看Token信息"
            >
              {showTokenInfo ? '隐藏信息' : 'Token信息'}
            </button>
          </div>

          {/* Token信息展示区域 */}
          {showTokenInfo && tokenInfo && (
            <div className="mt-3 p-3 bg-blue-500 rounded-lg text-sm">
              <h3 className="font-medium mb-2">Token 解析信息</h3>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-blue-100">应用 ID:</span>
                  <span className="text-white font-bold">{tokenInfo.appId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">授权域名:</span>
                  <span className="text-white">{tokenInfo.domain}</span>
                </div>
                {tokenInfo.userId && (
                  <div className="flex justify-between">
                    <span className="text-blue-100">用户 ID:</span>
                    <span className="text-white">{tokenInfo.userId}</span>
                  </div>
                )}
                {tokenInfo.iat && (
                  <div className="flex justify-between">
                    <span className="text-blue-100">签发时间:</span>
                    <span className="text-white">{new Date(tokenInfo.iat * 1000).toLocaleString()}</span>
                  </div>
                )}
                {tokenInfo.exp && (
                  <div className="flex justify-between">
                    <span className="text-blue-100">过期时间:</span>
                    <span className={`${tokenInfo.exp * 1000 < Date.now() ? 'text-red-300' : 'text-white'}`}>
                      {new Date(tokenInfo.exp * 1000).toLocaleString()}
                      {tokenInfo.exp * 1000 < Date.now() && ' (已过期)'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-blue-100">来源页面:</span>
                  <span className="text-white text-xs break-all">
                    {typeof document !== 'undefined' ? (document.referrer || '直接访问') : '未知'}
                  </span>
                </div>
                {userInfo?.dbUserId && (
                  <div className="flex justify-between">
                    <span className="text-blue-100">数据库用户ID:</span>
                    <span className="text-white">{userInfo.dbUserId}</span>
                  </div>
                )}
              </div>
              
              {/* 复制Token按钮 */}
              <div className="mt-2 pt-2 border-t border-blue-400">
                <button
                  onClick={() => {
                    if (token) {
                      navigator.clipboard.writeText(token);
                      alert('Token已复制到剪贴板');
                    }
                  }}
                  className="text-xs bg-blue-700 hover:bg-blue-800 text-white px-2 py-1 rounded"
                >
                  复制完整Token
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col bg-gray-50">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-lg shadow-sm p-3 max-w-xs lg:max-w-md ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-800'
                }`}>
                  <p>{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border-t p-4 flex-shrink-0">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入您的问题..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                发送
              </button>
            </div>
            
            {/* 底部状态栏 */}
            {tokenInfo && (
              <div className="mt-2 text-xs text-gray-500 flex justify-between items-center">
                <span>应用: {tokenInfo.appId}</span>
                {tokenInfo.exp && (
                  <span className={tokenInfo.exp * 1000 < Date.now() ? 'text-red-500' : 'text-green-600'}>
                    {tokenInfo.exp * 1000 < Date.now() ? 'Token已过期' : 'Token有效'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <EmbedContent />
    </Suspense>
  );
}
