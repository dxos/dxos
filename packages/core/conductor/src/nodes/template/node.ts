//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';

import { DEFAULT_OUTPUT, defineComputeNode, synchronizedComputeFunction } from '../../types';

import { computeTemplate } from './generic';

export const TemplateInput = Schema.Record({ key: Schema.String, value: Schema.Any });
export type TemplateInput = Schema.Schema.Type<typeof TemplateInput>;

export const TemplateOutput = Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Any });
export type TemplateOutput = Schema.Schema.Type<typeof TemplateOutput>;

export const templateNode = defineComputeNode({
  input: TemplateInput,
  output: TemplateOutput,
  exec: synchronizedComputeFunction((props = {}, node) => {
    invariant(node != null);
    const result = computeTemplate(node, props);
    return Effect.succeed({ [DEFAULT_OUTPUT]: result });
  }),
});
