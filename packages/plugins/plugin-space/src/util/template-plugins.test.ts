//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { pluginsToEnable } from './template-plugins.ts';

const state = {
  installed: new Map([
    ['org.dxos.plugin.markdown', 'Markdown'],
    ['org.dxos.plugin.sheet', 'Sheet'],
  ]),
  enabled: new Set(['org.dxos.plugin.markdown']),
};

describe('pluginsToEnable', () => {
  test('enables installed plugins that are off and reports those the host lacks', ({ expect }) => {
    expect(
      pluginsToEnable(
        { plugins: ['org.dxos.plugin.markdown', 'org.dxos.plugin.sheet', 'org.dxos.plugin.sheet', 'org.example.gone'] },
        state,
      ),
    ).toEqual({ enable: ['org.dxos.plugin.sheet'], unavailable: ['org.example.gone'] });
  });

  test('a template that names no plugins needs nothing', ({ expect }) => {
    expect(pluginsToEnable({}, state)).toEqual({ enable: [], unavailable: [] });
  });
});
