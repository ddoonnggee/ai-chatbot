(function(window) {
  'use strict';

  // AIChat 命名空间
  const AIChat = {
    // 配置选项
    config: {
      appId: '',
      token: '',
      showAcceptButton: true,
      showSummarizeButton: false,
      onAccept: null,
      onSummarize: null,
      theme: 'light',
      position: 'bottom-right',
      width: '400px',
      height: '600px'
    },

    // 内部状态
    _initialized: false,
    _iframe: null,
    _container: null,
    _isOpen: false,
    _apiBase: '',

    // 初始化方法
    init: function(options = {}) {
      if (this._initialized) {
        console.warn('AIChat already initialized');
        return this;
      }

      // 合并配置
      this.config = Object.assign({}, this.config, options);
      
      // 直接从当前脚本的 src 获取 API 基础路径
      const scripts = document.getElementsByTagName('script');
      for (let script of scripts) {
        if (script.src && script.src.includes('ai-chat.js')) {
          try {
            const url = new URL(script.src);
            this._apiBase = url.origin;
            console.log('从脚本URL获取apiBase:', this._apiBase);
            break;
          } catch (e) {
            console.warn('解析脚本URL失败:', e);
          }
        }
      }
      
      // 如果还没有找到，抛出错误
      if (!this._apiBase) {
        throw new Error('无法获取API基础路径，请确保正确加载ai-chat.js脚本');
      }

      console.log('AIChat配置:', {
        apiBase: this._apiBase,
        appId: this.config.appId,
        hasToken: !!this.config.token
      });

      // 验证必需参数
      if (!this.config.appId || !this.config.token) {
        throw new Error('appId and token are required');
      }

      this._initialized = true;
      this._createUI();
      this._setupEventListeners();

      return this;
    },

    // 创建用户界面
    _createUI: function() {
      // 创建容器
      this._container = document.createElement('div');
      this._container.id = 'ai-chat-container';
      this._container.style.cssText = `
        position: fixed;
        ${this._getPositionStyles()}
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: all 0.3s ease;
      `;

      // 创建触发按钮
      const triggerButton = document.createElement('button');
      triggerButton.id = 'ai-chat-trigger';
      triggerButton.innerHTML = `
        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.04 1.05 4.43L2 22l5.57-1.05C9.96 21.64 11.46 22 13 22h7c1.1 0 2-.9 2-2V12c0-5.52-4.48-10-10-10zm0 18c-1.1 0-2.18-.25-3.15-.74l-.85.16.16-.85C7.75 17.18 7.5 16.1 7.5 15c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5z"/>
        </svg>
      `;
      triggerButton.style.cssText = `
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      `;

      // 创建聊天窗口
      const chatWindow = document.createElement('div');
      chatWindow.id = 'ai-chat-window';
      chatWindow.style.cssText = `
        width: ${this.config.width};
        height: ${this.config.height};
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        display: none;
        flex-direction: column;
        overflow: hidden;
        margin-bottom: 20px;
      `;

      // 创建头部
      const header = document.createElement('div');
      header.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      header.innerHTML = `
        <div>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">AI 智能助手</h3>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">为您提供智能协助</p>
        </div>
        <button id="ai-chat-close" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 4px;">×</button>
      `;

      // 创建 iframe
      this._iframe = document.createElement('iframe');
      this._iframe.style.cssText = `
        width: 100%;
        height: calc(100% - 80px);
        border: none;
        background: white;
      `;
      
      // 使用内部的 _apiBase 构建 embed URL
      const embedUrl = `${this._apiBase}/api/embed?token=${encodeURIComponent(this.config.token)}`;
      console.log('构建的embed URL:', embedUrl);
      this._iframe.src = embedUrl;

      // 组装界面
      chatWindow.appendChild(header);
      chatWindow.appendChild(this._iframe);
      this._container.appendChild(chatWindow);
      this._container.appendChild(triggerButton);
      
      // 添加到页面
      document.body.appendChild(this._container);
    },

    // 获取位置样式
    _getPositionStyles: function() {
      const positions = {
        'bottom-right': 'bottom: 20px; right: 20px;',
        'bottom-left': 'bottom: 20px; left: 20px;',
        'top-right': 'top: 20px; right: 20px;',
        'top-left': 'top: 20px; left: 20px;'
      };
      return positions[this.config.position] || positions['bottom-right'];
    },

    // 设置事件监听
    _setupEventListeners: function() {
      const triggerButton = document.getElementById('ai-chat-trigger');
      const closeButton = document.getElementById('ai-chat-close');
      const chatWindow = document.getElementById('ai-chat-window');

      // 打开/关闭聊天窗口
      triggerButton.addEventListener('click', () => {
        this.toggle();
      });

      closeButton.addEventListener('click', () => {
        this.close();
      });

      // 监听来自 iframe 的消息
      window.addEventListener('message', (event) => {
        // 检查消息来源 - 使用内部的 _apiBase
        if (event.origin !== this._apiBase) return;

        const { type, action, data } = event.data;
        
        // 处理 iframe 请求宿主域名的消息
        if (type === 'REQUEST_HOST_DOMAIN') {
          const hostDomain = `${window.location.protocol}//${window.location.host}`;
          console.log('iframe 请求宿主域名，回复:', hostDomain);
          
          // 向 iframe 发送宿主域名信息
          if (this._iframe && this._iframe.contentWindow) {
            this._iframe.contentWindow.postMessage({
              type: 'HOST_DOMAIN_RESPONSE',
              domain: hostDomain
            }, this._apiBase);
          }
        }
        
        if (type === 'ai-chat-action') {
          switch (action) {
            case 'accept':
              if (this.config.onAccept && typeof this.config.onAccept === 'function') {
                this.config.onAccept(data);
              }
              break;
            case 'summarize':
              if (this.config.onSummarize && typeof this.config.onSummarize === 'function') {
                this.config.onSummarize(data);
              }
              break;
            case 'ready':
              console.log('AI Chat ready:', data);
              break;
          }
        }
      });

      // 点击外部关闭
      document.addEventListener('click', (event) => {
        if (this._isOpen && !this._container.contains(event.target)) {
          this.close();
        }
      });
    },

    // 打开聊天窗口
    open: function() {
      const chatWindow = document.getElementById('ai-chat-window');
      const triggerButton = document.getElementById('ai-chat-trigger');
      
      if (chatWindow && !this._isOpen) {
        chatWindow.style.display = 'flex';
        triggerButton.style.display = 'none';
        this._isOpen = true;
      }
      return this;
    },

    // 关闭聊天窗口
    close: function() {
      const chatWindow = document.getElementById('ai-chat-window');
      const triggerButton = document.getElementById('ai-chat-trigger');
      
      if (chatWindow && this._isOpen) {
        chatWindow.style.display = 'none';
        triggerButton.style.display = 'flex';
        this._isOpen = false;
      }
      return this;
    },

    // 切换聊天窗口
    toggle: function() {
      if (this._isOpen) {
        this.close();
      } else {
        this.open();
      }
      return this;
    },

    // 发送消息到聊天窗口
    sendMessage: function(message) {
      if (this._iframe && this._iframe.contentWindow) {
        try {
          this._iframe.contentWindow.postMessage({
            type: 'ai-chat-command',
            action: 'send-message',
            data: { message }
          }, this._apiBase);
          console.log('发送消息:', message);
        } catch (error) {
          console.error('发送消息失败:', error);
        }
      }
      return this;
    },

    // 销毁实例
    destroy: function() {
      if (this._container) {
        document.body.removeChild(this._container);
      }
      this._initialized = false;
      this._iframe = null;
      this._container = null;
      this._isOpen = false;
      this._apiBase = '';
      return this;
    }
  };

  // 暴露到全局
  window.AIChat = AIChat;

})(window);
