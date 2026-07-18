//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';
import { TranscriptionPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('TranscriptionPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), TranscriptionPlugin()],
    });

    // After autoStart: schema, OperationHandler, and SkillDefinition are dependency-mode roots and
    // all activate immediately.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler'), moduleId('SkillDefinition')]),
    );
  });
});
