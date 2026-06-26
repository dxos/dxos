//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Feed, Obj, Ref, Type } from '@dxos/echo';

/**
 * Feed-level record that links this session to a point in another session's history.
 * When present in a feed, the messages from the referenced feed up to and including
 * `messageId` are prepended to the conversation history before each turn.
 */
export class SessionLink extends Type.makeObject<SessionLink>(DXN.make('org.dxos.type.sessionLink', '0.1.0'))(
  Schema.Struct({
    /** Reference to the feed of the source session. */
    feedRef: Ref.Ref(Feed.Feed),
    /** Messages from the source feed up to and including this message ID are injected. */
    messageId: Obj.ID,
  }),
) {}
