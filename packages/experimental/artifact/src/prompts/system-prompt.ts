//
// Copyright 2024 DXOS.org
//

import { log } from '@dxos/log';

// @ts-ignore
import SYSTEM_PROMPT from './templates/system-prompt.tpl?raw';
import { type Artifact } from '../types';

export type SystemPromptOptions = {
  template?: string;
  artifacts?: Pick<Artifact, 'id' | 'prompt'>[];
};

/**
 * Process Handlebars template.
 */
// TODO(burdon): Generalize template mechanism.
export const createSystemPrompt = ({ template = SYSTEM_PROMPT, artifacts }: SystemPromptOptions = {}): string => {
  let count = 1;
  const values: Record<string, () => string> = {
    NUM: () => String(count++),
    ARTIFACT_PROVIDERS: () => artifacts?.map((artifact) => artifact.prompt).join('\n') ?? '',
  };

  // Remove comments and trim.
  template = template
    .replace(/^\{\{!.*\}\}$/gm, '')
    .replace(/\n\n\n/gm, '\n')
    .trim();

  // Replace template variables with values.
  return template.replace(/{{(.*?)}}/g, (match, p1) => {
    const provider = values[p1];
    if (!provider) {
      log.warn(`no provider for template variable: ${p1}`);
      return match;
    }

    return provider();
  });
};
