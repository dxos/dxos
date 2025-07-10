//
// Copyright 2025 DXOS.org
//

import { autocompletion, completionKeymap, type CompletionResult } from '@codemirror/autocomplete';
import { type Extension, RangeSet } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  keymap,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';

import { Mutex } from '@dxos/async';

export type ReferenceData = {
  uri: string;
  label: string;
  // TODO(dmaretskyi): Consider adding details renderer for when you hover over the reference.
};

export interface ReferencesProvider {
  getReferences({ query }: { query: string }): Promise<ReferenceData[]>;

  resolveReference({ uri }: { uri: string }): Promise<ReferenceData | null>;
}

export type PromptReferencesOptions = {
  provider: ReferencesProvider;
  /**
   * Will prevent the autocomplete from closing when the user blurs the editor.
   * @default false
   */
  debug?: boolean;
  /**
   * @default '@'
   */
  triggerCharacter?: string;
};

/**
 * Include references into text.
 */
export const promptReferences = ({
  provider,
  debug = false,
  triggerCharacter = '@',
}: PromptReferencesOptions): Extension => {
  if (triggerCharacter.length !== 1) {
    throw new Error('triggerCharacter must be a single character');
  }

  const decorationField = ViewPlugin.fromClass(
    class ReferenceView {
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
      provide: (plugin) => [
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
      activateOnTyping: true,
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
      closeOnBlur: !debug,
      tooltipClass: () => 'shadow rounded',
      aboveCursor: true,
    }),

    keymap.of(completionKeymap),
  ];
};

class ReferenceWidget extends WidgetType {
  constructor(private data: ReferenceData) {
    super();
  }

  override toDOM(): HTMLSpanElement {
    const span = document.createElement('span');
    span.textContent = `@ ${this.data.label}`;
    span.className = 'cm-reference-pill';
    return span;
  }

  override eq(other: ReferenceWidget): boolean {
    return other.data.uri === this.data.uri;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}
