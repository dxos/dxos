//
// Copyright 2024 DXOS.org
//

import { type LLMMessage, type LLMModel, type LLMTool } from '../types';

// TODO(dmaretskyi): Multi-backend support.
export interface AIBackend {
  run: (params: RunParams) => Promise<RunResult>;
}

export type RunParams = {
  model: LLMModel;
  messages: LLMMessage[];
  tools: LLMTool[];
};

export type RunResult = {
  message: LLMMessage;
};
