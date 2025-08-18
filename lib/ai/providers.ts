import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { xai } from '@ai-sdk/xai';
import { deepseek } from '@ai-sdk/deepseek';
import { openai } from '@ai-sdk/openai';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';

export const myProvider = isTestEnvironment
  ? customProvider({
    languageModels: {
      'chat-model': chatModel,
      'chat-model-reasoning': reasoningModel,
      'title-model': titleModel,
      'artifact-model': artifactModel,
    },
  })
  // OpenAI 配置 (已注释)
  // : customProvider({
  //   languageModels: {
  //     'chat-model': openai('gpt-4o'),
  //     'chat-model-reasoning': wrapLanguageModel({
  //       model: openai('o1-preview'),
  //       middleware: extractReasoningMiddleware({ tagName: 'think' }),
  //     }),
  //     'title-model': openai('gpt-4o-mini'),
  //     'artifact-model': openai('gpt-4o'),
  //   },
  //   imageModels: {
  //     'small-model': openai.imageModel('dall-e-3'),
  //   },
  // });

  // xAI 配置 (已注释)
  // : customProvider({
  //     languageModels: {
  //       'chat-model': xai('grok-2-vision-1212'),
  //       'chat-model-reasoning': wrapLanguageModel({
  //         model: xai('grok-3-mini-beta'),
  //         middleware: extractReasoningMiddleware({ tagName: 'think' }),
  //       }),
  //       'title-model': xai('grok-2-1212'),
  //       'artifact-model': xai('grok-2-1212'),
  //     },
  //     imageModels: {
  //       'small-model': xai.imageModel('grok-2-image'),
  //     },
  //   });

  // DeepSeek 配置 (当前使用)
  : customProvider({
    languageModels: {
      'chat-model': deepseek('deepseek-chat'),
      'chat-model-reasoning': wrapLanguageModel({
        model: deepseek('deepseek-reasoner'),
        middleware: extractReasoningMiddleware({ tagName: 'think' }),
      }),
      'title-model': deepseek('deepseek-chat'),
      'artifact-model': deepseek('deepseek-chat'),
    },
  });
