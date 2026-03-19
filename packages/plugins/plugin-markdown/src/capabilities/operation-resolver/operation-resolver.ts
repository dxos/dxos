//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';
import { Cursor, setSelection } from '@dxos/ui-editor';

import { Markdown, MarkdownCapabilities, MarkdownOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: MarkdownOperation.Create,
        handler: ({ name, content }) =>
          Effect.succeed({
            object: Markdown.make({ name, content }),
          }),
      }),
      OperationResolver.make({
        operation: MarkdownOperation.ScrollToAnchor,
        handler: Effect.fnUntraced(function* ({ subject, cursor }) {
          const editorViews = yield* Capability.get(MarkdownCapabilities.EditorViews);
          const entry = editorViews.get(subject);
          if (!entry) {
            return;
          }
          const range = Cursor.getRangeFromCursor(entry.view.state, cursor);
          if (range) {
            const selection =
              entry.view.state.selection.main.from !== range.from ? { anchor: range.from } : undefined;
            const effects: any[] = [EditorView.scrollIntoView(range.from, { y: 'start', yMargin: 96 })];
            if (selection) {
              effects.push(setSelection.of({ current: entry.documentId }));
            }
            entry.view.dispatch({
              effects,
              selection: selection ? { anchor: range.from } : undefined,
            });
          }
        }),
      }),
      // TODO(wittjosiah): This appears to be unused.
      OperationResolver.make({
        operation: MarkdownOperation.SetViewMode,
        handler: Effect.fnUntraced(function* ({ id, viewMode }) {
          yield* Capabilities.updateAtomValue(MarkdownCapabilities.State, (current) => ({
            ...current,
            viewMode: { ...current.viewMode, [id]: viewMode },
          }));
        }),
      }),
    ]);
  }),
);
