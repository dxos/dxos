//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceEvents from '@dxos/plugin-space/SpaceEvents';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SamplePlugin } from '#plugin';

import { meta } from './meta';
import * as SampleItem from './types/SampleItem';
import * as SampleOperation from './types/SampleOperation';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('SamplePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), SamplePlugin()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );
  });

  test('the create-object entry activates when a create is requested', async ({ expect }) => {
    // Positive coverage for `CreateObjectRequested`, which had none repo-wide: ~17 plugin tests
    // assert their CreateObject module is absent and none fires the event, so a broken
    // `create-object` body is invisible to tests and surfaces in production as a type silently
    // missing from the create dialog.
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), SamplePlugin()],
    });

    await harness.fire(SpaceEvents.CreateObjectRequested);
    expect(harness.manager.getActive()).toContain(moduleId('CreateObject'));
    expect(harness.getAll(SpaceCapabilities.CreateObjectEntry).length).toBeGreaterThan(0);
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
