//
// Copyright 2024 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import { type SpaceId } from '@dxos/keys';

import { createTemplate } from './template';
import SYSTEM_PROMPT from './templates/system-prompt.tpl?raw';

export type AssociatedArtifact = {
  spaceId: SpaceId;
  typename: string;
  id: string;
};

export type SystemPromptOptions = {
  /**
   * Instructions for each artifact.
   */
  artifacts?: string[];

  /**
   * Associated artifact to include in the prompt.
   */
  artifact?: AssociatedArtifact;

  /**
   * Whether to include suggestions in the prompt.
   */
  suggestions?: boolean;

  /**
   * Additional instructions to include in the prompt.
   */
  instructions?: string;
};

/**
 * Process Handlebars template.
 */
export const createSystemPrompt = (options: SystemPromptOptions = {}): string => {
  const template = createTemplate(SYSTEM_PROMPT);
  return template(defaultsDeep({}, options, { suggestions: true })).trim();
};
