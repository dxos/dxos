//
// Copyright 2025 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import { Model } from '@dxos/ai';
import { Template } from '@dxos/compute';
// Text is referenced in the inferred type of 'templates' (via Template.make → Template.Template.source → Ref.Ref(Text.Text));
// the import lets TypeScript name it in the emitted .d.ts.
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Text } from '@dxos/schema';

import FORMAT from './instructions/format.tpl?raw';
import SYSTEM from './instructions/system.tpl?raw';

/**
 * System template variables.
 */
export type SystemPromptOptions = Model.Capabilities & {
  DATETIME: string;
};

/**
 * Base system prompt.
 * NOTE: This contains protocol instructions that can not be dynamically edited.
 */
export const createSystemPrompt = (options: Partial<SystemPromptOptions> = {}) =>
  Template.process<SystemPromptOptions>(
    FORMAT,
    defaultsDeep(options, {
      DATETIME: new Date().toISOString(),
    }),
  );

/**
 * NOTE: We are forbidden from accessing randomness at model level in cloudflare, so we have to have pre-generated ids.
 */
const SYSTEM_ID = '01K2J2FZWH39F55CS7B26GP1Q3';

export const templates = {
  system: Template.make({
    id: SYSTEM_ID,
    source: SYSTEM,
  }),
};
