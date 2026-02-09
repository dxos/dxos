//
// Copyright 2025 DXOS.org
//

import { type CompletionResult, autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { type Extension, RangeSet } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
  keymap,
} from '@codemirror/view';

import { Mutex } from '@dxos/async';
import { invariant } from '@dxos/invariant';

// TODO(dmaretskyi): Consider adding details renderer for when you hover over the reference.
export type ReferenceData = {
  uri: string; // TODO(burdon): Rename dxn.
  label: string;
};

/**
 * @deprecated
 */
// TODO(burdon): Remove.
export interface ReferencesProvider {
  getReferences({ query }: { query: string }): Promise<ReferenceData[]>;
  resolveReference({ uri }: { uri: string }): Promise<ReferenceData | null>;
}

export type ReferencesOptions = {
  provider: ReferencesProvider;

  /**
   * @default '@'
   */
  triggerCharacter?: string;

  /**
   * Prevent the autocomplete from closing when the user blurs the editor.
   * @default false
   */
  debug?: boolean;
};

/**
 * Lookup object references.
 * @deprecated
 */
// TODO(burdon): Remove.
export const references = ({ provider, triggerCharacter = '@', debug = false }: ReferencesOptions): Extension => {
  invariant(triggerCharacter.length === 1);

  const decorationField = ViewPlugin.fromClass(
    class ReferenceView {
      // TODO(burdon): Why?
      private _mutex = new Mutex();

      decorations: DecorationSet = Decoration.set([]);

      constructor(view: EditorView) {
        queueMicrotask(async () => {
          const guard = await this._mutex.acquire();
          try {
            this.decorations = await this._computeDecorations(view);
          } finally {
            guard.release();
          }
        });
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          queueMicrotask(async () => {
            const guard = await this._mutex.acquire();
            try {
              this.decorations = await this._computeDecorations(update.view);
            } finally {
              guard.release();
            }
          });
        }
      }

      private async _computeDecorations(view: EditorView): Promise<DecorationSet> {
        const text = view.state.doc.toString();
        const references = text.matchAll(new RegExp(`${triggerCharacter}[a-zA-Z0-9@:]+\\s`, 'g'));

        const decorations = [];
        for (const match of references) {
          const reference = match[0];
          const uri = reference.slice(1, -1);
          const data = await provider.resolveReference({ uri });
          if (data) {
            decorations.push(
              Decoration.replace({
                widget: new ReferenceWidget(data),
              }).range(match.index!, match.index! + reference.length),
            );
          }
        }

        return Decoration.set(decorations);
      }
    },
    {
      decorations: (v) => v.decorations,
      provide: () => [
        EditorView.atomicRanges.of(
          (view): DecorationSet => view.plugin(decorationField)?.decorations ?? RangeSet.empty,
        ),
      ],
    },
  );

  return [
    decorationField,

    EditorView.theme({
      '.cm-reference-pill': {
        borderRadius: '0.25rem',
        borderWidth: '1px',
        marginRight: '0.25rem',
        marginLeft: '0.25rem',
      },
    }),

    autocompletion({
      tooltipClass: () => 'shadow rounded',
      activateOnTyping: true,
      aboveCursor: true,
      closeOnBlur: !debug,
      override: [
        async (context): Promise<CompletionResult | null> => {
          const match = context.matchBefore(new RegExp(`${triggerCharacter}[a-zA-Z0-9]+`));
          if (!match || match?.to === match?.from) {
            return null;
          }

          const query = match.text.slice(1);
          const references = await provider.getReferences({ query });
          return {
            from: match.from,
            filter: false,
            options: references.map((reference) => ({
              label: reference.label,
              apply: `${triggerCharacter}${reference.uri} `,
            })),
          };
        },
      ],
    }),

    keymap.of(completionKeymap),
  ];
};

class ReferenceWidget extends WidgetType {
  constructor(private data: ReferenceData) {
    super();
  }

  override ignoreEvent() {
    return true;
  }

  override eq(other: this) {
    return this.data.uri === other.data.uri;
  }

  override toDOM() {
    const span = document.createElement('span');
    span.textContent = `@${this.data.label}`;
    span.className = 'cm-reference-pill';
    return span;
  }
}
