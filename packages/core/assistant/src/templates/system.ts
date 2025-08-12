//
// Copyright 2025 DXOS.org
//

import { Template } from '@dxos/blueprints';

import FORMAT from './format.tpl?raw';
import SYSTEM from './system.tpl?raw';

type PromptOptions = {
  /**
   * Emit chain-of-thought inside <cot> tag.
   * Should be `false` for models with built-in reasoning: Claude, deepseek, o1.
   */
  cot?: boolean;

  /**
   * Whether to include suggestions in the prompt.
   */
  suggestions?: boolean;
};

/**
 * Base system prompt.
 * NOTE: This contains protocol instructions that can not be dynamically edited.
 */
export const createSystemPrompt = (options: PromptOptions) => Template.process<PromptOptions>(FORMAT, options);

export const templates = {
  // Editable system prompt.
  system: Template.make({ source: SYSTEM }),
};
