//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Model } from '@dxos/ai';
import { DXN } from '@dxos/keys';

import { modelIcon } from './model-icon.ts';

describe('modelIcon', () => {
  test('uses the vendor logo from the model id', ({ expect }) => {
    expect(modelIcon(Model.claudeSonnet5.id)).toBe('px--anthropic--regular');
    expect(modelIcon(Model.deepseekV4Pro.id)).toBe('px--deepseek--regular');
  });

  test('falls back for a vendor without a logo, or no model', ({ expect }) => {
    expect(modelIcon(Model.cloudflareClef.id)).toBe('ph--cpu--regular');
    expect(modelIcon(undefined)).toBe('ph--cpu--regular');
    expect(modelIcon(DXN.make('com.constructor.model.thing.default'))).toBe('ph--cpu--regular');
  });
});
