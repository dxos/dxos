//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SessionConfig } from '@dxos/ai';

import { NOT_INSTALLED, agentOptions } from './agent-options.ts';

const composer = { id: SessionConfig.COMPOSER_HARNESS, label: 'Composer', icon: 'ph--sparkle--regular' };
const local = { id: 'claude-code', label: 'Claude Code', icon: 'px--anthropic--regular' };
const cloud = { id: 'claude-code-edge', label: 'Claude Code (cloud)', icon: 'px--anthropic--regular' };

describe('agentOptions', () => {
  test('lists Composer first, then the other agents in registration order', ({ expect }) => {
    const options = agentOptions({
      agents: [local, composer, cloud],
      availability: [{ available: true }, { available: true }, { available: true }],
      current: SessionConfig.COMPOSER_HARNESS,
    });
    expect(options.map(({ value }) => value)).toEqual([composer.id, local.id, cloud.id]);
    expect(options.every(({ disabled }) => !disabled)).toBe(true);
  });

  test('disables an unavailable agent with its reason', ({ expect }) => {
    const options = agentOptions({
      agents: [composer, local, cloud],
      availability: [
        { available: true },
        { available: false, reason: 'needs the Composer desktop app' },
        { available: true },
      ],
      current: SessionConfig.COMPOSER_HARNESS,
    });
    expect(options[1]).toEqual({
      value: local.id,
      label: local.label,
      icon: local.icon,
      disabled: true,
      description: 'needs the Composer desktop app',
    });
    expect(options[2].disabled).toBe(false);
  });

  test('keeps an agent the chat names that this device does not register', ({ expect }) => {
    const options = agentOptions({
      agents: [composer],
      availability: [{ available: true }],
      current: 'claude-code-edge',
    });
    expect(options.at(-1)).toMatchObject({ value: 'claude-code-edge', disabled: true, description: NOT_INSTALLED });
  });
});
