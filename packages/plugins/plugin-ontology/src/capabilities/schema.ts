//
// Copyright 2026 DXOS.org
//

import { SpaceProperties } from '@dxos/client-protocol/types';
import { Blob, Collection } from '@dxos/echo';
import { AccessToken, Cursor } from '@dxos/link';
import { Expando } from '@dxos/schema';
import { Message, Organization, Person } from '@dxos/types';

/**
 * The base types no product plugin owns, registered here so a host that runs only bundled plugins
 * (EDGE) still knows them.
 */
export default [
  AccessToken.AccessToken,
  Blob.Blob,
  Collection.Collection,
  Cursor.Cursor,
  Expando.Expando,
  Message.Message,
  Organization.Organization,
  Person.Person,
  SpaceProperties,
];
