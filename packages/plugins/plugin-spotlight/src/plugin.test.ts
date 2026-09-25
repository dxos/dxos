//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';
import { SpotlightPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('SpotlightPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [SpotlightPlugin()],
    });

    // These are dependency-mode roots, so they all activate immediately. `#plugin` resolves the node
    // barrel here, which stubs `ReactRoot` — there is no React tree to mount headlessly.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('State'), moduleId('SpotlightDismiss'), moduleId('OperationHandler')]),
    );
    expect(harness.manager.getActive()).not.toContain(moduleId('ReactRoot'));
  });
});
