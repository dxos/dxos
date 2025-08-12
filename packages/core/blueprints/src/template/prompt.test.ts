//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { log } from '@dxos/log';
import { trim } from '@dxos/util';

import { process } from './prompt';

const TEMPLATE = trim`
  You are a useful assistant.

  ## {{section}}. Rules

  Use blueprints to create artifacts.

  ## {{section}}. Blueprints

  {{#each blueprints}}
  - {{this}}
  {{/each}}
`;

const BLUEPRINTS = [
  // prettier-ignore
  'Create a map.',
  'Create a kanban.',
  'Create a spreadsheet.',
  'Create a task list.',
];

describe('prompt', () => {
  test('should process template variables correctly', ({ expect }) => {
    const prompt = process(TEMPLATE, {
      blueprints: BLUEPRINTS,
      suggestions: true,
    });
    log(prompt);
    expect(prompt).to.include('## 2. Blueprints');
    expect(prompt).to.include(BLUEPRINTS[0]);
  });
});
