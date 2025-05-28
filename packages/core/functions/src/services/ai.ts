import type { AIServiceClient } from '@dxos/assistant';
import { Context } from 'effect';

export class AiService extends Context.Tag('AiService')<
  AiService,
  {
    readonly client: AIServiceClient;
  }
>() {}
