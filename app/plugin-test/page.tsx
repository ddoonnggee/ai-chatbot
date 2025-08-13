'use client';

import { useState, useEffect } from 'react';

// 扩展 Window 接口以包含 AIChat
declare global {
  interface Window {
    AIChat?: {
      init: (config: any) => void;
      destroy: () => void;
      _initialized?: boolean;
    };
  }
}

export default function PluginTestPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  
  // 修改表单状态，移除domain字段
  const [formData, setFormData] = useState({
    appId: 'client-test',
    userId: 'test-user-123'
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // 添加token编辑状态
  const [isEditingToken, setIsEditingToken] = useState(false);
  const [editableToken, setEditableToken] = useState('');
  const [originalToken, setOriginalToken] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const generateToken = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/plugin/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      const data = await response.json();
      setToken(data.token);
      setOriginalToken(data.token);
      setEditableToken(data.token);
      setIsEditingToken(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  // 添加token编辑相关函数
  const handleEditToken = () => {
    setIsEditingToken(true);
    setEditableToken(token);
  };

  const handleSaveToken = () => {
    setToken(editableToken);
    setIsEditingToken(false);
  };

  const handleCancelEdit = () => {
    setEditableToken(token);
    setIsEditingToken(false);
  };

  const handleResetToOriginal = () => {
    setToken(originalToken);
    setEditableToken(originalToken);
    setIsEditingToken(false);
  };

  const addTokenCorruption = (type: string) => {
    let corruptedToken = originalToken;
    
    switch (type) {
      case 'truncate':
        // 截断token
        corruptedToken = originalToken.slice(0, -10);
        break;
      case 'modify_signature':
        // 修改签名部分
        const parts = originalToken.split('.');
        if (parts.length === 3) {
          parts[2] = parts[2].slice(0, -5) + 'xxxxx';
          corruptedToken = parts.join('.');
        }
        break;
      case 'modify_payload':
        // 修改payload部分
        const tokenParts = originalToken.split('.');
        if (tokenParts.length === 3) {
          tokenParts[1] = tokenParts[1].slice(0, -5) + 'xxxxx';
          corruptedToken = tokenParts.join('.');
        }
        break;
      case 'expired':
        // 创建一个过期的token（修改exp时间）
        try {
          const parts = originalToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            payload.exp = Math.floor(Date.now() / 1000) - 3600; // 1小时前过期
            const newPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
            parts[1] = newPayload;
            corruptedToken = parts.join('.');
          }
        } catch (e) {
          corruptedToken = originalToken.slice(0, -10); // 如果处理失败，回退到截断
        }
        break;
    }
    
    setEditableToken(corruptedToken);
    setToken(corruptedToken);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetToDefaults = () => {
    setFormData({
      appId: 'client-test',
      userId: 'test-user-123'
    });
  };

  const openEmbedPage = () => {
    if (!token) {
      alert('请先生成 Token');
      return;
    }
    const embedUrl = `/embed?token=${encodeURIComponent(token)}`;
    const newWindow = window.open(embedUrl, '_blank', 'width=800,height=700,menubar=no,toolbar=no,location=no,status=no');
    
    if (!newWindow) {
      alert('无法打开新窗口，请检查浏览器的弹窗拦截设置');
    }
  };

  const goToMainPage = () => {
    if (typeof window !== 'undefined') {
      window.location.href = 'http://localhost:3000/';
    }
  };

  // 防止水合错误，在客户端挂载前不渲染某些内容
  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">AI Chat 插件测试</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">AI Chat 插件测试</h1>
      
      {/* 添加跳转到主页面的按钮 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">🏠 访问主页面</h2>
        <p className="text-blue-700 mb-4">
          点击下面的按钮跳转到主页面，使用您本地部署的完整 AI Chat 服务
        </p>
        <button
          onClick={goToMainPage}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 mr-4"
        >
          跳转到主页面 (localhost:3000)
        </button>
        <a
          href="http://localhost:3000/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 inline-block"
        >
          在新窗口打开主页面
        </a>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">1. 生成测试 Token</h2>
        <p className="text-gray-600 mb-4">
          配置应用信息并生成 JWT Token（授权域名基于应用配置）
        </p>
        
        {/* 基础配置 - 移除授权域名输入 */}
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              应用 ID *
            </label>
            <select
              value={formData.appId}
              onChange={(e) => handleInputChange('appId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="client-test">client-test (测试客户端)</option>
              <option value="client-abc">client-abc (ABC 客户端)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              选择已配置的应用ID，授权域名将从应用配置中获取
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户 ID
            </label>
            <input
              type="text"
              value={formData.userId}
              onChange={(e) => handleInputChange('userId', e.target.value)}
              placeholder="输入用户标识符（可选）"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              用于标识具体用户，可为空
            </p>
          </div>
        </div>

        {/* 高级选项 - 更新预设配置 */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <span className={`mr-1 transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>
              ▶
            </span>
            高级选项
          </button>
          
          {showAdvanced && (
            <div className="mt-3 p-4 bg-gray-50 rounded-md">
              <h4 className="font-medium text-gray-900 mb-3">预设配置</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => setFormData({
                    appId: 'client-abc',
                    userId: 'user-' + Date.now()
                  })}
                  className="text-left p-3 border border-gray-200 rounded hover:bg-white transition-colors"
                >
                  <div className="font-medium">ABC 客户端</div>
                  <div className="text-sm text-gray-600">client-abc (www.laravel10.test)</div>
                </button>
                
                <button
                  onClick={() => setFormData({
                    appId: 'client-test',
                    userId: 'dev-user'
                  })}
                  className="text-left p-3 border border-gray-200 rounded hover:bg-white transition-colors"
                >
                  <div className="font-medium">测试客户端</div>
                  <div className="text-sm text-gray-600">client-test (localhost:3000)</div>
                </button>
              </div>
              
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={resetToDefaults}
                  className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                >
                  重置为默认
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 生成按钮 - 更新禁用条件 */}
        <div className="flex space-x-2">
          <button
            onClick={generateToken}
            disabled={loading || !formData.appId}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '生成中...' : '生成 Token'}
          </button>
          
          {token && (
            <button
              onClick={() => {
                setToken('');
                setError('');
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              清除
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {token && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">生成的 Token:</h3>
            
            {isEditingToken ? (
              <div className="space-y-2">
                <textarea
                  value={editableToken}
                  onChange={(e) => setEditableToken(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded font-mono text-sm resize-none"
                  rows={6}
                  placeholder="编辑Token..."
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveToken}
                    className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    保存
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-sm bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleResetToOriginal}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    重置为原始
                  </button>
                </div>
                
                {/* 快速破坏Token按钮 */}
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-600 mb-2">快速生成测试用的错误Token:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => addTokenCorruption('truncate')}
                      className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    >
                      截断Token
                    </button>
                    <button
                      onClick={() => addTokenCorruption('modify_signature')}
                      className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    >
                      修改签名
                    </button>
                    <button
                      onClick={() => addTokenCorruption('modify_payload')}
                      className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    >
                      修改载荷
                    </button>
                    <button
                      onClick={() => addTokenCorruption('expired')}
                      className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600"
                    >
                      设为过期
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-3 rounded border font-mono text-sm break-all">
                {token}
              </div>
            )}
            
            {/* 显示配置信息 - 更新显示内容 */}
            <div className="mt-2 flex justify-between items-center">
              <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded flex-1 mr-2">
                <strong>配置信息:</strong> {formData.appId}
                {formData.userId && ` (用户: ${formData.userId})`}
                {originalToken !== token && (
                  <span className="text-orange-600 font-medium"> (已修改)</span>
                )}
              </div>
              
              {!isEditingToken && (
                <button
                  onClick={handleEditToken}
                  className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 whitespace-nowrap"
                >
                  编辑Token
                </button>
              )}
            </div>
            
            <div className="mt-2 space-x-2">
              <button
                onClick={() => navigator.clipboard.writeText(token)}
                className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
              >
                复制 Token
              </button>
              <button
                onClick={() => {
                  const embedUrl = `${window.location.origin}/embed?token=${encodeURIComponent(token)}`;
                  navigator.clipboard.writeText(embedUrl);
                  alert('嵌入链接已复制到剪贴板');
                }}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                复制嵌入链接
              </button>
              <button
                onClick={() => {
                  const config = `{
  appId: '${formData.appId}',
  token: '${token}'${formData.userId ? `,
  userId: '${formData.userId}'` : ''}
}`;
                  navigator.clipboard.writeText(config);
                  alert('配置代码已复制到剪贴板');
                }}
                className="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
              >
                复制配置代码
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">2. 测试嵌入页面</h2>
        <p className="text-gray-600 mb-4">
          使用生成的 Token 打开嵌入式页面
        </p>
        
        <div className="space-x-2">
          <button
            onClick={openEmbedPage}
            disabled={!token}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            打开嵌入页面
          </button>
          
          {token && (
            <a
              href={`/embed?token=${encodeURIComponent(token)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
            >
              在新标签页打开
            </a>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">3. JavaScript SDK 集成</h2>
        <p className="text-gray-600 mb-4">
          在您的网站中通过 JavaScript SDK 的方式集成 AI Chat：
        </p>
        
        <pre className="bg-gray-50 p-4 rounded border text-sm overflow-x-auto mb-4">
{`<!-- 在您的 HTML 页面中添加以下代码 -->
<script src="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/ai-chat.js"></script>
<script>
  AIChat.init({
    appId: 'client-test',
    token: 'YOUR_TOKEN_HERE',
    showAcceptButton: true,
    showSummarizeButton: false,
    position: 'bottom-right', // 可选: bottom-right, bottom-left, top-right, top-left
    width: '400px',
    height: '600px',
    theme: 'light',
    onAccept: (data) => { 
      console.log('用户采纳了建议:', data); 
    },
    onSummarize: (data) => { 
      console.log('用户请求总结:', data); 
    }
  });
</script>`}
        </pre>

        {token && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">实时 SDK 测试:</h3>
            <button
              onClick={() => {
                // 动态加载和测试 SDK
                const script = document.createElement('script');
                script.src = '/ai-chat.js';
                script.onload = () => {
                  if (window.AIChat) {
                    // 如果已经初始化，先销毁
                    if (window.AIChat._initialized) {
                      window.AIChat.destroy();
                    }
                    
                    window.AIChat.init({
                      appId: 'client-test',
                      token: token,
                      showAcceptButton: true,
                      showSummarizeButton: false,
                      position: 'bottom-right',
                      onAccept: (data: any) => {
                        alert('采纳建议: ' + JSON.stringify(data));
                      },
                      onSummarize: (data: any) => {
                        alert('总结请求: ' + JSON.stringify(data));
                      }
                    });
                  }
                };
                document.head.appendChild(script);
              }}
              className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700"
            >
              加载并测试 SDK
            </button>
            
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                <strong>注意:</strong> 点击上面的按钮将在当前页面加载 AI Chat SDK，您会在页面右下角看到聊天按钮。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">4. iframe 集成示例</h2>
        <p className="text-gray-600 mb-4">
          如果您更喜欢使用 iframe 方式集成：
        </p>
        
        <pre className="bg-gray-50 p-4 rounded border text-sm overflow-x-auto">
{`<iframe 
  src="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/embed?token=YOUR_TOKEN_HERE"
  width="100%" 
  height="600"
  frameborder="0">
</iframe>`}
        </pre>

        {token && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">实时嵌入预览:</h3>
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={`/embed?token=${encodeURIComponent(token)}`}
                width="100%"
                height="500"
                frameBorder="0"
                className="w-full"
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              这是一个实时的嵌入式聊天界面预览，功能完全可用。
            </p>
          </div>
        )}
      </div> */}
    </div>
  );
}
