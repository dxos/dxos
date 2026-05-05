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

  test('supports helpers, block helpers, and {{#if}} conditionals', ({ expect }) => {
    const template = trim`
      ## {{section}}. Header

      {{#if showList}}
      Items:
      {{#each items}}
      - {{this}}
      {{/each}}
      {{/if}}

      ## {{section}}. Footer
    `;

    const prompt = process(template, {
      showList: true,
      items: ['alpha', 'beta'],
    });

    expect(prompt).to.include('## 1. Header');
    expect(prompt).to.include('## 2. Footer');
    expect(prompt).to.include('- alpha');
    expect(prompt).to.include('- beta');

    const hidden = process(template, { showList: false });
    expect(hidden).to.not.include('Items:');
  });

  test('section helper is isolated between calls', ({ expect }) => {
    const template = '{{section}}-{{section}}';
    expect(process(template, {})).toBe('1-2');
    expect(process(template, {})).toBe('1-2');
  });
});
