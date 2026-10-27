//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SessionConfig } from '@dxos/ai';

import { NOT_INSTALLED, agentOptions, optionForHarness } from './agent-options.ts';

const composer = {
  id: SessionConfig.COMPOSER_HARNESS,
  label: 'Composer',
  icon: 'ph--sparkle--regular',
  locations: ['local', 'edge'] as const,
};
const local = { id: 'claude-code', label: 'Claude Code', icon: 'px--anthropic--regular', ownModel: true };
const cloud = {
  id: 'claude-code-edge',
  label: 'Claude Code',
  icon: 'px--anthropic--regular',
  locations: ['edge'] as const,
  variantOf: 'claude-code',
  ownModel: true,
};

describe('agentOptions', () => {
  test('lists Composer first, then the other agents in registration order', ({ expect }) => {
    const options = agentOptions({
      agents: [{ id: 'other', label: 'Other', icon: 'ph--robot--regular' }, composer, local],
      availability: [{ available: true }, { available: true }, { available: true }],
      current: SessionConfig.COMPOSER_HARNESS,
    });
    expect(options.map(({ value }) => value)).toEqual([composer.id, 'other', local.id]);
    expect(options.every(({ disabled }) => !disabled)).toBe(true);
  });

  test('folds a variant into the agent it names, one placement per location', ({ expect }) => {
    const options = agentOptions({
      agents: [composer, cloud, local],
      availability: [{ available: true }, { available: true }, { available: true }],
      current: cloud.id,
    });
    expect(options.map(({ value }) => value)).toEqual([composer.id, local.id]);
    expect(options[1].placements).toEqual([
      { location: 'edge', harness: cloud.id, available: true },
      { location: 'local', harness: local.id, available: true },
    ]);
    expect(options[1].ownModel).toBe(true);
    expect(optionForHarness(options, cloud.id)?.value).toBe(local.id);
    expect(options[0].placements.map(({ location }) => location)).toEqual(['local', 'edge']);
  });

  test('keeps the choices of the registration that is not a variant', ({ expect }) => {
    const agentModel = [{ id: 'opus', label: 'Opus' }];
    const options = agentOptions({
      agents: [cloud, { ...local, choices: { agentModel } }],
      availability: [{ available: true }, { available: true }],
      current: local.id,
    });
    expect(options[0].choices).toEqual({ agentModel });
  });

  test('prefers the main registration where both offer a setting, and keeps what only the variant offers', ({
    expect,
  }) => {
    const agentModel = [{ id: 'opus', label: 'Opus' }];
    const agentMode = [{ id: 'auto', label: 'Auto' }];
    const options = agentOptions({
      agents: [
        { ...cloud, choices: { agentModel: [{ id: 'haiku', label: 'Haiku' }], agentMode } },
        { ...local, choices: { agentModel } },
      ],
      availability: [{ available: true }, { available: true }],
      current: local.id,
    });
    expect(options[0].choices).toEqual({ agentModel, agentMode });
  });

  test('disables an agent only when none of its placements is available', ({ expect }) => {
    const options = agentOptions({
      agents: [composer, local, cloud],
      availability: [
        { available: true },
        { available: false, reason: 'needs the Composer desktop app' },
        { available: true },
      ],
      current: SessionConfig.COMPOSER_HARNESS,
    });
    expect(options[1].disabled).toBe(false);
    expect(options[1].placements[0]).toEqual({
      location: 'local',
      harness: local.id,
      available: false,
      reason: 'needs the Composer desktop app',
    });

    const [, only] = agentOptions({
      agents: [composer, local],
      availability: [{ available: true }, { available: false, reason: 'needs the Composer desktop app' }],
      current: SessionConfig.COMPOSER_HARNESS,
    });
    expect(only).toMatchObject({ disabled: true, description: 'needs the Composer desktop app' });
  });

  test('keeps an agent the chat names that this device does not register', ({ expect }) => {
    const options = agentOptions({
      agents: [composer],
      availability: [{ available: true }],
      current: 'claude-code-edge',
    });
    expect(options.at(-1)).toMatchObject({ value: 'claude-code-edge', disabled: true, description: NOT_INSTALLED });
  });

  test('keeps an agent the chat names in its variant row when only the variant is registered', ({ expect }) => {
    const options = agentOptions({
      agents: [composer, cloud],
      availability: [{ available: true }, { available: true }],
      current: local.id,
    });
    expect(options.map(({ value }) => value)).toEqual([composer.id, local.id]);
    expect(options[1].placements).toEqual([
      { location: 'edge', harness: cloud.id, available: true },
      { location: 'local', harness: local.id, available: false, reason: NOT_INSTALLED },
    ]);
  });
});
