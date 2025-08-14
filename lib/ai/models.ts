export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: '聊天模型',
    description: '适用于各种聊天的主要模型',
  },
  {
    id: 'chat-model-reasoning',
    name: '推理模型',
    description: '使用高级推理',
  },
];
