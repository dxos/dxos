//
// Copyright 2025 DXOS.org
//

import { Context } from 'effect';

import { ImageSource, type AIServiceClient } from '@dxos/assistant';
import { ECHO_ATTR_TYPE, S } from '@dxos/echo-schema';

import type { ComputeEffect, GptInput, GptOutput, ValueBag } from '../types';

export const IMAGE_TYPENAME = 'example.org/type/Image';

export const Image = S.Struct({
  id: S.String,
  prompt: S.String,
  source: ImageSource,
});

export type Image = S.Schema.Type<typeof Image>;

export const isImage = (value: any): value is Image => value?.[ECHO_ATTR_TYPE] === IMAGE_TYPENAME;

export class GptService extends Context.Tag('GptService')<
  GptService,
  {
    readonly invoke: (input: ValueBag<GptInput>) => ComputeEffect<ValueBag<GptOutput>>;
    readonly getAiServiceClient?: () => AIServiceClient;
  }
>() {}
