//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SamplePlugin } from './cli/plugin';
import { SampleOperation } from './operations';
import { SampleItem } from './types';

describe('SamplePlugin', () => {
  test('CreateSampleItem returns a SampleItem object', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [SamplePlugin()] });
    const { object } = await harness.invoke(SampleOperation.CreateSampleItem, { name: 'hello' });
    expect(object.name).toBe('hello');
    expect(object.status).toBe('active');
  });

  test('Randomize mutates the SampleItem fields in place', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [SamplePlugin()] });
    const item = SampleItem.make({ name: 'before' });
    await harness.invoke(SampleOperation.Randomize, { item });
    expect(item.name).not.toBe('before');
    expect(item.description).toEqual(expect.any(String));
    expect(['active', 'archived', 'draft']).toContain(item.status);
  });

  test('UpdateStatus sets the status field', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [SamplePlugin()] });
    const item = SampleItem.make({ name: 'task', status: 'active' });
    await harness.invoke(SampleOperation.UpdateStatus, { item, status: 'archived' });
    expect(item.status).toBe('archived');
  });
});
