//
// Copyright 2025 DXOS.org
//

import { Context, Schema } from 'effect';

import { ImageSource } from '@dxos/artifact';
import { ECHO_ATTR_TYPE } from '@dxos/echo-schema';

import { type GptInput, type GptOutput } from '../../nodes';
import type { ComputeEffect, ValueBag } from '../../types';

export const IMAGE_TYPENAME = 'example.org/type/Image';

export const MESSAGE_TYPENAME = 'example.org/type/Message';

export const Image = Schema.Struct({
  id: Schema.String,
  prompt: Schema.String,
  source: ImageSource,
});

export type Image = Schema.Schema.Type<typeof Image>;

export const isImage = (value: any): value is Image => value?.[ECHO_ATTR_TYPE] === IMAGE_TYPENAME;

export class GptService extends Context.Tag('GptService')<
  GptService,
  {
    readonly invoke: (input: ValueBag<GptInput>) => ComputeEffect<ValueBag<GptOutput>>;
  }
>() {}
