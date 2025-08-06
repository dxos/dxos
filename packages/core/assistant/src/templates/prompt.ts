//
// Copyright 2025 DXOS.org
//

import { Template } from '@dxos/blueprints';

import ASSISTANT from './assistant.tpl?raw';

/**
 * Type for assistant prompt variables.
 */
// TODO(burdon): Replace with builder?
export type AssistantPromptOptions = {
  /**
   * Instructions for each blueprint.
   */
  blueprints?: string[];

  /**
   * Additional instructions to include in the prompt.
   */
  instructions?: string;

  /**
   * Whether to include suggestions in the prompt.
   */
  suggestions?: boolean;

  /**
   * Emit chain-of-thought inside <cot> tag.
   * Should be `false` for models with built-in reasoning: Claude, deepseek, o1.
   */
  cot?: boolean;
};

export const createSystemPrompt = (options: AssistantPromptOptions = {}) => {
  return Template.createPrompt(ASSISTANT, options);
};
