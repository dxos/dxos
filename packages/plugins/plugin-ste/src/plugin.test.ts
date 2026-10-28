//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Harness from '@dxos/plugin-testing/Harness';

import { meta } from '#meta';
import { SteOperation } from '#operations';
import { StePlugin } from '#plugin';
import { SteSkill } from '#skills';

await Harness.preload({ plugins: [StePlugin()] });

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('StePlugin', () => {
  test('the skill definition activates when the assistant starts', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({ plugins: [StePlugin()] });
    expect(harness.manager.getActive()).not.toContain(moduleId('SkillDefinition'));

    await harness.fire(AppActivationEvents.AssistantStart);
    expect(harness.manager.getActive()).toContain(moduleId('SkillDefinition'));
    const keys = harness.getAll(AppCapabilities.SkillDefinition).map(({ key }) => key);
    expect(keys).toContain(SteSkill.key);
  });

  test('invokes the Verify operation', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({ plugins: [StePlugin()] });
    const result = await harness.invoke(SteOperation.Verify, { text: "You should stop; it's hot.", vocabulary: false });
    expect(result.passed).toBe(false);
    expect(result.errors.map(({ rule }) => rule)).toEqual(['8.1', '4.2', '3.2']);

    const clean = await harness.invoke(SteOperation.Verify, { text: 'Stop the engine.', mode: 'procedural' });
    expect(clean.passed).toBe(true);
  });
});
