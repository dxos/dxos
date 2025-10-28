//
// Copyright 2025 DXOS.org
//

import { next as A, type Doc } from '@automerge/automerge';

import { DocAccessor, toCursorRange } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { isNonNullable } from '@dxos/util';

// Relevant info:
// https://github.com/Minahil-official/GPT-4.1-Promting-Guide?tab=readme-ov-file#-apply-patch-tool-format-v4a-diff

// TODO(burdon): Anthropic only.
//  https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/text-editor-tool#example-str-replace-command
//  AI_TOOL_NOT_FOUND: str_replace_based_edit_tool
// 'str_replace_based_edit_tool',

// TOOD(burdon): Support append to end (no "-").

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

export const computeDiffsWithCursors = <T>(accessor: DocAccessor<T>, diffs: readonly string[]) => {
  return reduceDiffs(diffs)
    .map((diff) => {
      const text = DocAccessor.getValue<string>(accessor);
      const idx = text.indexOf(diff.match);
      if (idx !== -1) {
        return { cursor: toCursorRange(accessor, idx, idx + diff.match.length), text: diff.replace };
      }
    })
    .filter(isNonNullable);
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
