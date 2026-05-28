//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SamplePlugin } from '#plugin';

import { meta } from './meta';
import { SampleOperation } from './types';
import { SampleItem } from './types';

const moduleId = (name: string) => `${DXN.getName(meta.id)}.module.${name}`;

describe('SamplePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), SamplePlugin()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('CreateObject'), moduleId('schema'), moduleId('OperationHandler')]),
    );
  });

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
