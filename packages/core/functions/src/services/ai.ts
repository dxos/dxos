//
// Copyright 2025 DXOS.org
//

import { Context } from 'effect';

import type { AIServiceClient } from '@dxos/ai';

// TODO(burdon): Move to @dxos/ai.
export class AiService extends Context.Tag('AiService')<
  AiService,
  {
    readonly client: AIServiceClient;
  }
>() {}
