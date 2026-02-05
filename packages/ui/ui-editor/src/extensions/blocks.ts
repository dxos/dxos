//
// Copyright 2025 DXOS.org
//

import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { mx } from '@dxos/ui-theme';

const paragraphBlockPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.build(update.view);
      }
    }

    build({ state }: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();

      // Helper: commit a block from blockStart to endLine (inclusive).
      const pushBlock = (fromLine: number, toLine: number) => {
        // Add line decorations for each line in the block.
        for (let lineNum = fromLine; lineNum <= toLine; lineNum++) {
          const line = state.doc.line(lineNum);
          builder.add(
            line.from,
            line.from,
            Decoration.line({
              class: mx(
                'block-line',
                fromLine === toLine && 'block-single',
                lineNum === fromLine && 'block-first',
                lineNum > fromLine && lineNum < toLine && 'block-middle',
                lineNum === toLine && 'block-last',
              ),
            }),
          );
        }
      };

      let blockStart: number | null = null;
      let consecutiveBlankLines = 0;
      const totalLines = state.doc.lines;
      for (let i = 1; i <= totalLines; i++) {
        const line = state.doc.line(i);
        const isBlank = /^\s*$/.test(line.text);

        if (!isBlank) {
          // Reset blank line counter.
          consecutiveBlankLines = 0;
          // Start a new block if we're not already in one.
          if (blockStart === null) {
            blockStart = i;
          }
        } else {
          // Increment blank line counter.
          consecutiveBlankLines++;

          // End the current block if we have 2+ consecutive blank lines.
          if (consecutiveBlankLines >= 2 && blockStart !== null) {
            pushBlock(blockStart, i - consecutiveBlankLines);
            blockStart = null;
          }
        }
      }

      // Handle any remaining block at the end of the document.
      if (blockStart !== null) {
        // Find the last non-blank line for the block end.
        let lastNonBlankLine = totalLines;
        while (lastNonBlankLine >= blockStart) {
          const line = state.doc.line(lastNonBlankLine);
          if (!/^\s*$/.test(line.text)) {
            break;
          }
          lastNonBlankLine--;
        }
        if (lastNonBlankLine >= blockStart) {
          pushBlock(blockStart, lastNonBlankLine);
        }
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

export const blocks = () => [
  paragraphBlockPlugin,
  EditorView.baseTheme({
    '.cm-line.block-line': {
      paddingLeft: '0.75rem',
      paddingRight: '0.75rem',
      borderLeft: '1px solid var(--dx-subduedSeparator)',
      borderRight: '1px solid var(--dx-subduedSeparator)',
    },
    '.cm-line.block-single': {
      border: '1px solid var(--dx-subduedSeparator)',
      borderRadius: '6px',
      paddingTop: '0.5rem',
      paddingBottom: '0.5rem',
      marginTop: '0.5rem',
      marginBottom: '0.5rem',
    },
    '.cm-line.block-first': {
      borderTop: '1px solid var(--dx-subduedSeparator)',
      borderTopLeftRadius: '6px',
      borderTopRightRadius: '6px',
      paddingTop: '0.5rem',
      marginTop: '0.5rem',
    },
    '.cm-line.block-middle': {},
    '.cm-line.block-last': {
      borderBottom: '1px solid var(--dx-subduedSeparator)',
      borderBottomLeftRadius: '6px',
      borderBottomRightRadius: '6px',
      paddingBottom: '0.5rem',
      marginBottom: '0.5rem',
    },
  }),
];
