//
// Copyright 2024 DXOS.org
//

// TODO(dmaretskyi): Kill this.
// @ts-nocheck

import { assertArgument, invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import type { AiServiceClient, GenerationStream } from './service';
import { type GenerateRequest, type GenerateResponse, type LLMModel } from '../../types';

/**
 * @deprecated
 */
export type AiServiceEdgeClientOptions = {
  endpoint: string;
  defaultGenerationOptions?: {
    model?: LLMModel;
  };
};
