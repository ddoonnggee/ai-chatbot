const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

export const APP_CONFIGS = {
  'client-abc': {
    secret: 'abc-secret-123',
    allowedDomains: [
      'http://www.laravel10.test',
      'http://www.laravel12.test',
      'https://www.laravel12.test'
    ],
    name: 'ABC 客户端',
    description: '测试客户端配置'
  },
  'client-learnku': {
    secret: 'learnku-secret-123',
    allowedDomains: [
      'http://learnku.fangchangkemao.com/',
      'https://learnku.fangchangkemao.com/'
    ],
    name: 'learnku 客户端',
    description: 'learnku'
  },
  'client-test': {
    secret: 'test-secret-456',
    allowedDomains: [
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ],
    name: '测试客户端',
    description: '本地测试用客户端'
  }
};

export function getAppConfig(appId: string) {
  return APP_CONFIGS[appId as keyof typeof APP_CONFIGS] || null;
}

export function isAllowedDomain(appId: string, domain: string): boolean {
  const config = getAppConfig(appId);
  if (!config) return false;

  return config.allowedDomains.some(allowedDomain => {
    if (allowedDomain === domain) {
      return true;
    }

    if (allowedDomain.startsWith('*.')) {
      const baseDomain = allowedDomain.substring(2);
      const domainUrl = new URL(domain);
      return domainUrl.hostname.endsWith(baseDomain);
    }

    return false;
  });
}

export function getAllAppIds(): string[] {
  return Object.keys(APP_CONFIGS);
}
