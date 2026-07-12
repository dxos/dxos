//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, DXN, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Panproto } from '@dxos/echo-panproto';
import { EffectEx } from '@dxos/effect';
import { Connection } from '@dxos/plugin-connector';
import { AtprotoRecordAnnotation, AtprotoVisibilityAnnotation } from '@dxos/schema';
import { AccessToken } from '@dxos/types';

import { AtprotoPublication } from '#types';

import { computePublishedValues } from './field-values';
import { computeStatus, deriveDisplayStatus, publishObject, unpublishObject } from './publish';
import * as AtprotoRepo from './services/AtprotoRepo';

// A minimal atproto-annotated type. Its lens projects only the public `text` field, exercising the
// generic publish machinery without depending on a specific content plugin.
const testLens: Panproto.Lens = { adapters: [{ kind: 'scalar', wire: 'text', echo: ['text'] }] };

class TestDoc extends Type.makeObject<TestDoc>(DXN.make('org.dxos.test.atprotoDoc', '0.1.0'))(
  Schema.Struct({
    text: Schema.String.pipe(AtprotoVisibilityAnnotation.set('publish')),
    secret: Schema.optional(Schema.String),
  }).pipe(AtprotoRecordAnnotation.set({ collection: 'com.example.doc', rkey: 'tid', lens: testLens })),
) {}

const NOW = 1_700_000_000_000;

describe('publish', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([
      Connection.Connection,
      AccessToken.AccessToken,
      AtprotoPublication.AtprotoPublication,
      TestDoc,
    ]);
    const token = db.add(
      Obj.make(AccessToken.AccessToken, { source: 'bsky.app', token: 'tok', account: 'alice.test' }),
    );
    const connection = db.add(
      Obj.make(Connection.Connection, { connectorId: 'bluesky', accessToken: Ref.make(token) }),
    );
    const doc = db.add(Obj.make(TestDoc, { text: 'hello', secret: 'do-not-publish' }));
    return { db, connection, doc };
  };

  const publications = (db: Database.Database, doc: Obj.Unknown) =>
    EffectEx.runPromise(
      Database.query(Query.select(Filter.id(doc.id)).targetOf(AtprotoPublication.AtprotoPublication)).run.pipe(
        Effect.provide(Database.layer(db)),
      ),
    );

  test('publishes to the (mock) repo and records an AtprotoPublication', async ({ expect }) => {
    const { db, connection, doc } = await setup();
    const mock = AtprotoRepo.makeMock();

    const publication = await EffectEx.runPromise(
      publishObject({ object: doc, connection, db, now: NOW }).pipe(Effect.provide(AtprotoRepo.layerMock(mock))),
    );

    expect(publication.collection).toBe('com.example.doc');
    expect(publication.uri).toContain('com.example.doc');
    // The public projection reached the repo; the private field did not.
    const stored = [...mock.records.values()][0];
    expect(stored).toEqual({ text: 'hello' });
    expect(stored).not.toHaveProperty('secret');

    const found = await publications(db, doc);
    expect(found.length).toBe(1);
    expect(await computeStatus(doc, publication)).toBe('published');
  });

  test('snapshots published field values (and only those) on the publication', async ({ expect }) => {
    const { db, connection, doc } = await setup();
    const mock = AtprotoRepo.makeMock();

    // The generic snapshot captures published leaves and excludes private fields.
    expect(await computePublishedValues(doc)).toEqual({ text: 'hello' });

    const publication = await EffectEx.runPromise(
      publishObject({ object: doc, connection, db, now: NOW }).pipe(Effect.provide(AtprotoRepo.layerMock(mock))),
    );

    // The publication stores the snapshot so per-field divergence can be flagged later.
    expect(publication.publishedValues).toEqual({ text: 'hello' });

    // After editing the published field, the live value diverges from the stored snapshot.
    Obj.update(doc, (doc) => {
      doc.text = 'changed';
    });
    expect((await computePublishedValues(doc)).text).not.toBe(publication.publishedValues?.text);
  });

  test('detects an out-of-date publication after the object changes', async ({ expect }) => {
    const { db, connection, doc } = await setup();
    const mock = AtprotoRepo.makeMock();
    const publication = await EffectEx.runPromise(
      publishObject({ object: doc, connection, db, now: NOW }).pipe(Effect.provide(AtprotoRepo.layerMock(mock))),
    );

    expect(await computeStatus(doc, publication)).toBe('published');
    Obj.update(doc, (doc) => {
      doc.text = 'changed';
    });
    expect(await computeStatus(doc, publication)).toBe('outOfDate');
  });

  test('unpublishes: deletes the record and removes the AtprotoPublication', async ({ expect }) => {
    const { db, connection, doc } = await setup();
    const mock = AtprotoRepo.makeMock();
    const publication = await EffectEx.runPromise(
      publishObject({ object: doc, connection, db, now: NOW }).pipe(Effect.provide(AtprotoRepo.layerMock(mock))),
    );
    expect(mock.records.size).toBe(1);

    await EffectEx.runPromise(unpublishObject({ publication, db }).pipe(Effect.provide(AtprotoRepo.layerMock(mock))));

    expect(mock.records.size).toBe(0);
    const found = await publications(db, doc);
    expect(found.length).toBe(0);
  });
});

describe('deriveDisplayStatus', () => {
  const eligible = { ok: true } as const;
  const ineligible = { ok: false, reason: 'no catalog link' } as const;
  const unverifiable = { ok: false, reason: 'offline', unverifiable: true } as const;

  test('unpublished splits into ready / ineligible by eligibility', ({ expect }) => {
    expect(deriveDisplayStatus('unpublished', eligible)).toBe('ready');
    expect(deriveDisplayStatus('unpublished', ineligible)).toBe('ineligible');
  });

  test('published / out-of-date pass through when verifiable', ({ expect }) => {
    expect(deriveDisplayStatus('published', eligible)).toBe('published');
    expect(deriveDisplayStatus('outOfDate', eligible)).toBe('outOfDate');
    // A definitive ineligibility does not hide the publication state (the reason is surfaced separately).
    expect(deriveDisplayStatus('published', ineligible)).toBe('published');
  });

  test('unverifiable eligibility overrides every publication state', ({ expect }) => {
    expect(deriveDisplayStatus('unpublished', unverifiable)).toBe('unknown');
    expect(deriveDisplayStatus('published', unverifiable)).toBe('unknown');
    expect(deriveDisplayStatus('outOfDate', unverifiable)).toBe('unknown');
  });
});
