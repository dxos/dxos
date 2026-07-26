//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, test } from 'vitest';

import { ViewState, createDefaultBackends } from '@dxos/react-ui-attention';

import { COMPANION_VIEW_STATE_CONTEXT, companionAspect } from './companion-view-state';

describe('companionAspect', () => {
  test('declares one local aspect for variant and split', ({ expect }) => {
    expect(companionAspect.key).toEqual('deck-companion');
    expect(companionAspect.backend).toEqual('local');
    expect(companionAspect.defaultValue()).toEqual({});
  });

  test('variant and split coexist without clobbering each other', ({ expect }) => {
    const registry = Registry.make();
    const manager = new ViewState.Manager({ registry, backends: createDefaultBackends(registry) });

    // Set a split size, then a variant — the variant write must preserve the split.
    manager.update(companionAspect, COMPANION_VIEW_STATE_CONTEXT, (prev) => ({ ...prev, horizontal: 24 }));
    manager.update(companionAspect, COMPANION_VIEW_STATE_CONTEXT, (prev) => ({ ...prev, variant: 'chat' }));

    expect(manager.get(companionAspect, COMPANION_VIEW_STATE_CONTEXT)).toEqual({ horizontal: 24, variant: 'chat' });

    // A split change on the other orientation preserves both prior fields.
    manager.update(companionAspect, COMPANION_VIEW_STATE_CONTEXT, (prev) => ({ ...prev, vertical: 18 }));
    expect(manager.get(companionAspect, COMPANION_VIEW_STATE_CONTEXT)).toEqual({
      horizontal: 24,
      vertical: 18,
      variant: 'chat',
    });
  });
});
