//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EID } from '@dxos/keys';
import { AccessToken } from '@dxos/types';

import { Integration } from '../types';
import { migrations } from './migrations';

describe('Integration migrations', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Integration.IntegrationV1, Integration.Integration, AccessToken.AccessToken]);
    const token = db.add(Obj.make(AccessToken.AccessToken, { source: 'imap:mail.example.com', token: 'tok' }));
    return { db, token };
  };

  // v0.1.0 -> v0.2.0 wraps the single accessToken Ref in a one-element accessTokens array.
  const transform = (from: unknown, db: any) => migrations[0].transform(from, { db });

  test('wraps the single accessToken in a one-element array and preserves all fields', async ({ expect }) => {
    const { db, token } = await setup();
    const v1 = db.add(
      Obj.make(Integration.IntegrationV1, {
        name: 'Work Mail',
        providerId: 'imap',
        accessToken: Ref.make(token),
        targets: [{ remoteId: 'INBOX', name: 'Inbox' }],
        snapshots: { 'imap:1': { uid: 1 } },
      }),
    );

    const result: any = await transform(v1, db);
    expect(result.accessTokens).toHaveLength(1);
    expect(EID.getEntityId(EID.tryParse(result.accessTokens[0].uri)!)).toBe(
      EID.getEntityId(EID.tryParse(Ref.make(token).uri)!),
    );
    expect(result.name).toBe('Work Mail');
    expect(result.providerId).toBe('imap');
    expect(result.targets).toEqual(v1.targets);
    expect(result.snapshots).toEqual({ 'imap:1': { uid: 1 } });
  });

  test('omits optional fields that are absent on the source row', async ({ expect }) => {
    const { db, token } = await setup();
    const v1 = db.add(Obj.make(Integration.IntegrationV1, { accessToken: Ref.make(token), targets: [] }));

    const result: any = await transform(v1, db);
    expect(result.accessTokens).toHaveLength(1);
    expect(result.targets).toEqual([]);
    expect('name' in result).toBe(false);
    expect('providerId' in result).toBe(false);
    expect('snapshots' in result).toBe(false);
  });
});
