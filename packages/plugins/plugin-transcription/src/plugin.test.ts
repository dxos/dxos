//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as TranscriptionPlugin from '#meta';

import { TranscriptionNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), TranscriptionPlugin.make()] });

const moduleId = (name: string) => `${TranscriptionNamespace.key}.module.${name}`;

describe('TranscriptionPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), TranscriptionPlugin.make()],
    });

    // After autoStart: schema, OperationHandler, and SkillDefinition are dependency-mode roots and
    // all activate immediately.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );
  });
});
