//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { SpaceProperties } from '@dxos/client-protocol/types';
import { Blob, Collection, Type } from '@dxos/echo';
import { AccessToken, Cursor } from '@dxos/link';
import { Expando } from '@dxos/schema';
import { Message, Organization, Person } from '@dxos/types';

import * as OntologyPlugin from '#meta';

describe('OntologyPlugin', () => {
  test('activates and registers exactly the base types', async ({ expect }) => {
    const { failures, operationKeys, skillKeys, typenames } = await activateHeadlessPlugins([OntologyPlugin.make()]);
    expect(failures).toEqual([]);
    expect(operationKeys).toEqual([]);
    expect(skillKeys).toEqual([]);
    expect([...typenames].sort()).toEqual(
      [
        AccessToken.AccessToken,
        Blob.Blob,
        Collection.Collection,
        Cursor.Cursor,
        Expando.Expando,
        Message.Message,
        Organization.Organization,
        Person.Person,
        SpaceProperties,
      ]
        .map((type) => Type.getTypename(type))
        .sort(),
    );
  });
});
