//
// Copyright 2025 DXOS.org
//

import { Template } from '@dxos/blueprints';

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
 * @deprecated
 */
// TODO(burdon): Remove.
export const createSystemPrompt = (options: PromptOptions = {}) => {
  return Template.createPrompt(SYSTEM, options);
};

export const templates = {
  system: Template.make({ source: SYSTEM }),
};
