//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Feed, Obj, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { FeedAnnotation, getFeedRef, isFeedOwnerSchema } from './feed';

/** Holds its feed under `feed`, like `Mailbox` and `Calendar`. */
class Mailbox extends Type.makeObject<Mailbox>(DXN.make('com.example.type.mailbox', '0.1.0'))(
  Schema.Struct({ feed: Ref.Ref(Feed.Feed) }).pipe(FeedAnnotation.set({ property: 'feed' })),
) {}

/** Holds its feed under a different name — the case a hardcoded `.feed` cannot serve. */
class Journal extends Type.makeObject<Journal>(DXN.make('com.example.type.journal', '0.1.0'))(
  Schema.Struct({ entries: Ref.Ref(Feed.Feed) }).pipe(FeedAnnotation.set({ property: 'entries' })),
) {}

class Contact extends Type.makeObject<Contact>(DXN.make('com.example.type.contact', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
) {}

describe('FeedAnnotation', () => {
  test('isFeedOwnerSchema discriminates annotated types', ({ expect }) => {
    expect(isFeedOwnerSchema(Mailbox)).toBe(true);
    expect(isFeedOwnerSchema(Journal)).toBe(true);
    expect(isFeedOwnerSchema(Contact)).toBe(false);
  });

  test('getFeedRef resolves the annotated property, not a hardcoded `feed`', ({ expect }) => {
    const feed = Obj.make(Feed.Feed, {});
    expect(getFeedRef(Obj.make(Mailbox, { feed: Ref.make(feed) }))?.uri).toEqual(Ref.make(feed).uri);
    expect(getFeedRef(Obj.make(Journal, { entries: Ref.make(feed) }))?.uri).toEqual(Ref.make(feed).uri);
  });

  test('getFeedRef returns undefined for an unannotated type', ({ expect }) => {
    expect(getFeedRef(Obj.make(Contact, { name: 'Alice' }))).toBeUndefined();
  });
});
