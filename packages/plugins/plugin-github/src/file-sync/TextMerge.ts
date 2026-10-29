//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { next as A } from '@automerge/automerge';
import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { BaseError } from '@dxos/errors';
import { type Text } from '@dxos/schema';

/** The heads are not in the object's history, e.g. the object was replaced since the last sync. */
export class TextMergeError extends BaseError.extend('TextMergeError', 'The heads are not in the text’s history.') {}

/**
 * Apply the `base` → `next` change to `text` as of `heads`, so Automerge merges it with every local
 * edit made since. `base` is the content `text` held at `heads`. Returns the heads at which `text`
 * holds exactly `next`, which the next sync applies its change at.
 */
export const applyAt = (
  text: Text.Text,
  change: { readonly base: string; readonly next: string; readonly heads: readonly string[] },
): Effect.Effect<readonly string[], TextMergeError> =>
  Effect.try({
    try: () => {
      const accessor = Doc.createAccessor(text, ['content']);
      const heads = accessor.handle.changeAt([...change.heads], (doc) => {
        A.updateText(doc, accessor.path.slice(), change.next);
      });
      // No heads back means the content at `heads` already equals `next`.
      return heads ?? change.heads;
    },
    catch: (cause) => new TextMergeError({ cause, context: { heads: change.heads } }),
  });

/** The heads of `text`'s document now: what `content` was read at. */
export const currentHeads = (text: Text.Text): readonly string[] => Obj.version(text).automergeHeads ?? [];

/** True when `text` differs from its content at `heads`: the object has local edits to push. */
export const changedSince = (text: Text.Text, heads: readonly string[]): Effect.Effect<boolean> =>
  Effect.sync(() => {
    const accessor = Doc.createAccessor(text, ['content']);
    const snapshot: unknown = A.view(accessor.handle.doc(), [...heads]);
    const then = accessor.path.reduce<unknown>(
      (value, key) => (value !== null && typeof value === 'object' ? Reflect.get(value, key) : undefined),
      snapshot,
    );
    return then !== text.content;
  });
