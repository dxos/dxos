//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import { Person } from '@dxos/types';

import * as OntologyPlugin from '#meta';

describe('OntologyPlugin in workerd', () => {
  test('activates headless and contributes its types', async ({ expect }) => {
    const { failures, typenames } = await activateHeadlessPlugins([OntologyPlugin.make()]);
    expect(failures).toEqual([]);
    expect(typenames).toContain(Type.getTypename(Person.Person));
  });
});
