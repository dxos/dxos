//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type MetricSpec, type Shortcut } from '@dxos/plugin-space/dashboard';

import * as Protocol from '#protocol';

import { buildFrame } from './frame.ts';

const device = Protocol.streamDeckPlus;
const key: Shortcut = { target: 'root/space/db/notes/01', label: 'Notes', icon: 'ph--note--regular' };
const dial: MetricSpec = { kind: 'stat', title: 'Objects', value: '12' };

describe('buildFrame', () => {
  test('renders a key with its press target', ({ expect }) => {
    const frame = buildFrame({ device, keys: [key], dials: [] });
    expect(frame._tag).toBe('frame');
    expect(frame.keys[0]?.target).toBe(key.target);
    expect(frame.keys[0]?.svg).toContain('Notes');
  });

  test('an empty slot renders an image with no target, so the device clears it', ({ expect }) => {
    const frame = buildFrame({ device, keys: [null], dials: [] });
    expect(frame.keys[0]?.target).toBeUndefined();
    expect(frame.keys[0]?.svg).toContain('<rect');
  });

  test('inlines a resolved icon and tolerates a missing one', ({ expect }) => {
    const icons = { 'ph--note--regular': { markup: '<path d="M0 0h8v8H0z"/>', viewBox: '0 0 8 8' } };
    expect(buildFrame({ device, keys: [key], dials: [], icons }).keys[0]?.svg).toContain('viewBox="0 0 8 8"');
    expect(buildFrame({ device, keys: [key], dials: [] }).keys[0]?.svg).toContain('<circle');
  });

  test('renders dials and preserves empty segments', ({ expect }) => {
    const frame = buildFrame({ device, keys: [], dials: [dial, null] });
    expect(frame.dials).toEqual([{ title: 'Objects', value: '12' }, null]);
  });

  test('renders keys at the device resolution', ({ expect }) => {
    expect(buildFrame({ device, keys: [key], dials: [] }).keys[0]?.svg).toContain(`width="${device.keySize[0]}"`);
  });
});
