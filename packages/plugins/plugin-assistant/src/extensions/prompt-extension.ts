//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { Facet, type Extension, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

export type PromptExtensionOptions = {
  /** Called when the user clicks the run button on a prompt code block. */
  onRun: (promptText: string) => void;
};

type OnRun = (text: string) => void;

// Module-level facet so the plugin singleton can read the latest handler.
const promptHandlerFacet = Facet.define<OnRun, OnRun | null>({
  combine: (handlers) => handlers[0] ?? null,
});

// Module-level singleton — CM6 deduplicates by reference equality, preventing duplicate buttons
// when the extension is contributed more than once.
const promptPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        update.focusChanged ||
        update.startState.facet(promptHandlerFacet) !== update.state.facet(promptHandlerFacet)
      ) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const onRun = view.state.facet(promptHandlerFacet);
      if (!onRun) {
        return Decoration.none;
      }

      const ranges: Range<Decoration>[] = [];

      syntaxTree(view.state).iterate({
        enter: (node) => {
          if (node.name === 'FencedCode') {
            const info = node.node.getChild('CodeInfo');
            if (info) {
              const type = view.state.sliceDoc(info.from, info.to);
              const text = node.node.getChild('CodeText');
              if (type === 'prompt' && text) {
                const content = view.state.sliceDoc(text.from, text.to).trim();
                if (content.length > 0) {
                  // Mark the header line as a positioned container for the button overlay.
                  ranges.push(Decoration.line({ class: 'cm-prompt-header' }).range(node.from, node.from));
                  ranges.push(
                    Decoration.widget({ widget: new PromptRunWidget(content, onRun), side: -1 }).range(
                      node.from,
                      node.from,
                    ),
                  );
                }
              }
            }
          }
        },
      });

      // sort=true lets CM6 order by startSide (line decorations before widgets at the same position).
      return Decoration.set(ranges, true);
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

// Base theme wires up the positioned container on the header line.
const promptTheme = EditorView.baseTheme({
  '.cm-prompt-header': {
    position: 'relative',
    overflow: 'visible',
  },
});

/**
 * CodeMirror extension that adds a "run" button to ```prompt fenced code blocks.
 */
export const promptRunExtension = ({ onRun }: PromptExtensionOptions): Extension => [
  promptHandlerFacet.of(onRun),
  promptPlugin,
  promptTheme,
];

class PromptRunWidget extends WidgetType {
  constructor(
    private readonly prompt: string,
    private readonly onClick: OnRun,
  ) {
    super();
  }

  override eq(other: this) {
    return this.prompt === other.prompt && this.onClick === other.onClick;
  }

  override ignoreEvent() {
    return false;
  }

  override toDOM() {
    return Domino.of('button')
      .classNames(
        'dx-button h-6 w-6 min-h-0 p-1 absolute top-0 right-0 bg-green-bg hover:bg-green-surface text-green-fg',
      )
      .on('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.onClick(this.prompt);
      })
      .append(
        Domino.of('svg', Domino.SVG)
          .classNames('w-4 h-4 cursor-pointer')
          .append(
            Domino.of('use', Domino.SVG).attributes({
              href: Domino.icon('ph--sparkle--regular'),
            }),
          ),
      ).root;
  }
}
