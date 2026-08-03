//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import { describe, test } from 'vitest';

import { ViewState, createDefaultBackends } from '@dxos/react-ui-attention';

import { COMPANION_VIEW_STATE_CONTEXT, companionAspect } from './companion-view-state';

describe('companionAspect', () => {
  test('declares one local aspect for the selected variant', ({ expect }) => {
    expect(companionAspect.key).toEqual('deck-companion');
    expect(companionAspect.backend).toEqual('local');
    expect(companionAspect.defaultValue()).toEqual({});
  });

  test('a variant write round-trips through the manager', ({ expect }) => {
    const registry = Registry.make();
    const manager = new ViewState.Manager({ registry, backends: createDefaultBackends(registry) });

    manager.update(companionAspect, COMPANION_VIEW_STATE_CONTEXT, (prev) => ({ ...prev, variant: 'chat' }));
    expect(manager.get(companionAspect, COMPANION_VIEW_STATE_CONTEXT)).toEqual({ variant: 'chat' });
  });
});
