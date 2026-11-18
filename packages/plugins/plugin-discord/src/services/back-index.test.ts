//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Trigger from '@dxos/compute/Trigger';

import { findBackIndex, toggleChannel } from './back-index.ts';

const trigger = (input: Record<string, unknown>) => Trigger.make({ spec: Trigger.specTimer('*/2 * * * *'), input });

describe('findBackIndex', () => {
  test('finds the trigger whose input names the bot and its crawl state', () => {
    const other = trigger({ applicationId: 'other', channels: ['a'], state: 's' });
    const notBackIndex = trigger({ applicationId: 'kai', channels: ['b'] });
    const mine = trigger({ applicationId: 'kai', channels: ['c1', 'c2'], state: 's' });
    expect(findBackIndex([other, notBackIndex, mine], 'kai')).toEqual({ trigger: mine, channels: ['c1', 'c2'] });
    expect(findBackIndex([other, notBackIndex], 'kai')).toBeUndefined();
  });
});

describe('toggleChannel', () => {
  test('adds an absent channel and removes a present one', () => {
    expect(toggleChannel(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleChannel(['a', 'b'], 'a')).toEqual(['b']);
  });
});
