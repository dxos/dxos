//
// Copyright 2025 DXOS.org
//

import { next as A, type Doc } from '@automerge/automerge';
import { Effect, Schema } from 'effect';

import { ArtifactId } from '@dxos/assistant';
import { DocAccessor, createDocAccessor } from '@dxos/echo-db';
import { DatabaseService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';
import { trim } from '@dxos/util';

import { Markdown } from '../types';

// TODO(burdon): Create variant of function that creates comments.
export default defineFunction({
  name: 'dxos.org/function/markdown/diff',
  description: trim`
    Applies a set of diffs to the markdown document.
  `,
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the markdown document.',
    }),
    diffs: Schema.Array(Schema.String).annotations({
      description: 'The diffs to apply to the document.',
    }),
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ data: { id, diffs } }) {
    const object = yield* DatabaseService.resolve(ArtifactId.toDXN(id), Markdown.Document);
    const content = yield* Effect.promise(() => object.content.load());
    const accessor = createDocAccessor(content, ['content']);
    applyDiffs(accessor, diffs);
  }),
});

export type Diff = {
  match: string;
  replace: string;
};

/**
 * Convert a list of diffs into a list of operations.
 */
export const reduceDiffs = (diffs: readonly string[]): Diff[] => {
  return diffs.reduce<Diff[]>((acc, diff) => {
    const current = acc[acc.length - 1];
    const [op, ...rest] = diff.split(' ');
    switch (op) {
      case '-': {
        if (current && !current.match) {
          current.match += rest.join(' ');
        } else {
          acc.push({ match: rest.join(' '), replace: '' });
        }
        return acc;
      }
      case '+': {
        if (current && !current.replace) {
          current.replace += rest.join(' ');
        } else {
          acc.push({ match: '', replace: rest.join(' ') });
        }
        return acc;
      }
    }

    return acc;
  }, []);
};

export const applyDiffs = <T>(accessor: DocAccessor<T>, diffs: readonly string[]): string => {
  for (const diff of reduceDiffs(diffs)) {
    accessor.handle.change((doc: Doc<T>) => {
      const text = DocAccessor.getValue<string>(accessor);
      const idx = text.indexOf(diff.match);
      if (idx !== -1) {
        // TODO(burdon): Replace smallest substring.
        // NOTE: This only replaces the first match.
        A.splice(doc, accessor.path as A.Prop[], idx, diff.match.length, diff.replace);
      } else {
        log.warn('diff not found', diff);
      }
    });
  }

  return DocAccessor.getValue<string>(accessor);
};
