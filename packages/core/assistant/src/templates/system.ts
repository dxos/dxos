//
// Copyright 2025 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import { type ModelCapabilities } from '@dxos/ai';
import { Template } from '@dxos/blueprints';

import FORMAT from './instructions/format.tpl?raw';
import SYSTEM from './instructions/system.tpl?raw';

/**
 * System template variables.
 */
export type SystemPromptOptions = ModelCapabilities & {
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

export const templates = {
  /** Editable system prompt.*/
  system: Template.make({
    /**
     * NOTE: We are forbidden from accessing randomness at model level in cloudflare, so we have to have pre-generated ids.
     */
    id: '01K2J2FZWH39F55CS7B26GP1Q3',
    source: SYSTEM,
  }),
};
