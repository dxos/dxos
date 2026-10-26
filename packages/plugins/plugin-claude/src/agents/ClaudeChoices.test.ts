//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClaudeChoices from './ClaudeChoices.ts';

describe('ClaudeChoices', () => {
  test('offers every permission mode the plugin setting accepts', ({ expect }) => {
    expect(ClaudeChoices.MODES.map(({ id }) => id)).toEqual(['default', 'acceptEdits', 'auto', 'bypassPermissions']);
    expect(ClaudeChoices.CHOICES).toEqual({
      agentModel: ClaudeChoices.MODELS,
      agentEffort: ClaudeChoices.EFFORTS,
      agentMode: ClaudeChoices.MODES,
    });
  });

  test('turns the chosen model and effort into Agent SDK options, leaving out what was not chosen', ({ expect }) => {
    expect(ClaudeChoices.sdkOptions(undefined)).toEqual({});
    expect(ClaudeChoices.sdkOptions({ agentModel: 'opus' })).toEqual({ model: 'opus' });
    expect(ClaudeChoices.sdkOptions({ agentModel: 'haiku', agentEffort: 'low' })).toEqual({
      model: 'haiku',
      effort: 'low',
    });
  });

  test("runs a chat's own mode, else the setting's, else auto", ({ expect }) => {
    expect(ClaudeChoices.permissionMode({ agentMode: 'acceptEdits' }, { agentPermissionMode: 'default' })).toBe(
      'acceptEdits',
    );
    expect(ClaudeChoices.permissionMode({}, { agentPermissionMode: 'bypassPermissions' })).toBe('bypassPermissions');
    expect(ClaudeChoices.permissionMode(undefined, undefined)).toBe('auto');
  });
});
