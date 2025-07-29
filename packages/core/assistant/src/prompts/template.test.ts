//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { log } from '@dxos/log';
import { trim } from '@dxos/util';

import { createSystemPrompt } from './system-prompt';
import { createTemplate } from './template';

const TEMPLATE = trim`
  # Test

  ## {{section}}. Rules

  Create artifacts.

  ## {{section}}. Artifacts

  {{#each artifacts}}
  - {{this}}
  {{/each}}
`;

const ARTIFACTS = [
  //
  'Create a map.',
  'Create a kanban.',
  'Create a spreadsheet.',
  'Create a task list.',
];

describe('template', () => {
  test('should process template variables correctly', ({ expect }) => {
    const template = createTemplate(TEMPLATE);
    const prompt = template({
      artifacts: ARTIFACTS,
      suggestions: true,
    });
    log(prompt);
    expect(prompt).to.include('## 1. Rules');
    expect(prompt).to.include(ARTIFACTS[0]);
  });

  test('system prompt', ({ expect }) => {
    const prompt = createSystemPrompt({
      artifacts: ARTIFACTS,
      suggestions: true,
    });
    log(prompt);
  });
});
