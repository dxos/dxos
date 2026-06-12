//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Trigger } from '@dxos/compute';
import { type Database, DXN, Feed, Obj, Ref, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EID, URI } from '@dxos/keys';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { Automation } from '#types';

import { automationsForObject, connectedAutomationsQuery } from './automations-for-object';

// A minimal feed-annotated host (like a mailbox): an object holding a `feed` ref.
const FeedHost = Schema.Struct({
  name: Schema.optional(Schema.String),
  feed: Ref.Ref(Feed.Feed),
}).pipe(Type.makeObject(DXN.make('org.dxos.test.feedHost', '0.1.0')));

const types = [Automation.Automation, Trigger.Trigger, Feed.Feed, FeedHost];

const initSpace = async (harness: Awaited<ReturnType<typeof createComposerTestApp>>) => {
  const { personalSpace } = await EffectEx.runAndForwardErrors(
    initializeIdentity(harness.get(ClientCapabilities.Client)),
  );
  await harness.waitForEvent(ClientEvents.SpacesReady);
  return personalSpace.db;
};

const connectedIds = (db: Database.Database, object: Obj.Unknown) =>
  db
    .query(connectedAutomationsQuery(object))
    .run()
    .then((automations) => automations.map((automation) => automation.id).sort());

// Build a space-qualified ref like the RefField object picker does (from the entity's fully-qualified URI),
// rather than the bare ref `Ref.make` produces — this is the encoding real triggers carry, and it exercises
// the reverse-ref EID normalization that lets qualified refs match a space-less anchor.
const qualifiedRef = (db: Database.Database, object: Obj.Unknown) =>
  Ref.fromURI(URI.make(EID.make({ spaceId: db.spaceId, entityId: object.id })));

describe('automations connected to an object', () => {
  test('input-ref: trigger whose nested input references the object', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin({ types })] });
    const db = await initSpace(harness);

    const target = db.add(Automation.make({ name: 'target', triggers: [] }));
    const other = db.add(Automation.make({ name: 'other', triggers: [] }));
    // The target ref is nested in the trigger's untyped `input` record, and is space-qualified like a
    // picker-created ref.
    const trigger = db.add(Trigger.make({ input: { subject: qualifiedRef(db, target) } }));
    const owner = db.add(Automation.make({ name: 'owner', triggers: [Ref.make(trigger)] }));
    await db.flush();

    expect(automationsForObject(target, [owner, other]).map((automation) => automation.id)).toEqual([owner.id]);
    expect(automationsForObject(other, [owner])).toEqual([]);

    // Poll to absorb index latency; the query resolves via the reverse-ref index.
    await expect.poll(() => connectedIds(db, target), { timeout: 5_000 }).toEqual([owner.id]);
    await expect.poll(() => connectedIds(db, other), { timeout: 5_000 }).toEqual([]);
  });

  test('feed-ref: feed trigger bound to the object’s feed', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin({ types })] });
    const db = await initSpace(harness);

    const feed = db.add(Feed.make());
    const host = db.add(Obj.make(FeedHost, { name: 'mailbox', feed: Ref.make(feed) }));
    const other = db.add(Automation.make({ name: 'other', triggers: [] }));
    // Picker-created feed refs are space-qualified (unlike `Trigger.specFeed`'s bare `Ref.make`); the host's
    // own feed ref is bare (code-created). They must still match through the reverse-ref index.
    const feedTrigger = db.add(Trigger.make({ spec: { kind: 'feed', feed: qualifiedRef(db, feed) } }));
    const owner = db.add(Automation.make({ name: 'feed-owner', triggers: [Ref.make(feedTrigger)] }));
    await db.flush();

    expect(automationsForObject(host, [owner, other]).map((automation) => automation.id)).toEqual([owner.id]);

    await expect.poll(() => connectedIds(db, host), { timeout: 5_000 }).toEqual([owner.id]);
  });
});
