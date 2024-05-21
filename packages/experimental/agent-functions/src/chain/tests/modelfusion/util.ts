//
// Copyright 2024 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';
import { type FunctionOptions, ollama, openai, type TextGenerationModelSettings } from 'modelfusion';

import { log } from '@dxos/log';
import { stripUndefinedValues } from '@dxos/util';

//
// NOTE: Only use for testing.
//

export const defaultModelOptions = {
  temperature: 0,
  maxGenerationTokens: 500,
};

export const getApi = (type: 'openai' | 'ollama' = 'ollama') => {
  switch (type) {
    case 'openai':
      return openai;

    case 'ollama':
      return ollama;
  }
};

export const getDefaultModelOptions = (type: 'openai' | 'ollama' = 'ollama') => {
  switch (type) {
    case 'openai':
      return {
        model: 'gpt-3.5-turbo',
      };

    case 'ollama':
      return {
        model: 'mistral',
      };
  }
};

export const createChatTextGenerator = (
  type: 'openai' | 'ollama' = 'ollama',
  options?: TextGenerationModelSettings,
) => {
  return getApi(type).ChatTextGenerator(defaultsDeep(getDefaultModelOptions(type), options, defaultModelOptions));
};

export const createCompletionTextGenerator = (
  type: 'openai' | 'ollama' = 'ollama',
  options?: TextGenerationModelSettings,
) => {
  return getApi(type).CompletionTextGenerator(defaultsDeep(getDefaultModelOptions(type), options, defaultModelOptions));
};

let id = 0;
export const functionOptions = (functionId?: string): FunctionOptions => ({
  // logging: 'detailed-json',
  functionId: functionId ?? `test-${id++}`,
  observers: [
    {
      onFunctionEvent: ({ functionId, functionType, callId, eventType }) => {
        log.info('onFunctionEvent', stripUndefinedValues({ functionId, functionType, callId, eventType }));
      },
    },
  ],
});
