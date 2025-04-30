//
// Copyright 2024 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import { createTemplate } from './template';
import SYSTEM_PROMPT from './templates/system-prompt.tpl?raw';

export type AssociatedArtifact = {
  id: string;
  typename: string;
};

export type SystemPromptOptions = {
  /**
   * Instructions for each artifact.
   */
  artifacts?: string[];

  /**
   * Whether to include suggestions in the prompt.
   */
  suggestions?: boolean;

  /**
   * Associated artifact to include in the prompt.
   */
  associatedArtifact?: AssociatedArtifact;
};

/**
 * Process Handlebars template.
 */
export const createSystemPrompt = (options: SystemPromptOptions = {}): string => {
  const template = createTemplate(SYSTEM_PROMPT);
  return template(defaultsDeep({}, options, { suggestions: true }));
};
