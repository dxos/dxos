//
// Copyright 2025 DXOS.org
//

import { Context } from 'effect';

import { ImageSource } from '@dxos/artifact';
import { type AIServiceClient } from '@dxos/assistant';
import { ECHO_ATTR_TYPE, S } from '@dxos/echo-schema';

import { type GptInput, type GptOutput } from '../../nodes';
import type { ComputeEffect, ValueBag } from '../../types';

export const IMAGE_TYPENAME = 'example.org/type/Image';

export const MESSAGE_TYPENAME = 'example.org/type/Message';

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
