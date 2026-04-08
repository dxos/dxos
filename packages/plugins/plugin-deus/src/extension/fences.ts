//
// Copyright 2026 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder, type Extension } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

// Per-type hue palette for block type keyword.
const BLOCK_TYPE_COLORS: Record<string, string> = {
  ext: 'var(--color-violet-400)',
  type: 'var(--color-blue-400)',
  op: 'var(--color-orange-400)',
  feat: 'var(--color-emerald-400)',
  test: 'var(--color-cyan-400)',
  component: 'var(--color-pink-400)',
  service: 'var(--color-yellow-400)',
  db: 'var(--color-red-400)',
};

const theme = EditorView.baseTheme({
  '.cm-mdl-fence-tick': { color: 'var(--color-slate-400)' },
  '.cm-mdl-block-id': { color: 'var(--color-orange-400)' },
  '.cm-mdl-block-header': { color: 'var(--color-pink-400)' },
  '.cm-mdl-field': { color: 'var(--color-blue-400)' },
  '.cm-mdl-punct': { color: 'var(--color-slate-400)' },
  '.cm-mdl-comment': { color: 'var(--color-green-400)', fontStyle: 'italic' },
  ...Object.fromEntries(
    Object.entries(BLOCK_TYPE_COLORS).map(([type, color]) => [`& .cm-mdl-block-${type}`, { color }]),
  ),
});

/** Color a single line of the block body using regex matching. */
const decorateLine = (builder: RangeSetBuilder<Decoration>, lineText: string, lineFrom: number): void => {
  const trimmed = lineText.trimStart();
  const indent = lineText.length - trimmed.length;
  const abs = (offset: number) => lineFrom + offset;

  // Standalone comment line.
  if (trimmed.startsWith('#')) {
    builder.add(abs(indent), abs(lineText.length), Decoration.mark({ class: 'cm-mdl-comment' }));
    return;
  }

  // Field name line: "<fieldName> [id][?]: value"
  // e.g. "req F-1.1: prose", "kind: PieceKind", "piece?: Piece"
  const lineMatch = trimmed.match(/^([\w][\w-]*)(?:\s+([\w][\w.\-]*))?(\??)(\s*:)(.*)/s);
  if (!lineMatch) {
    // No field pattern — still color any trailing " #" comment.
    const commentIdx = lineText.indexOf(' #', indent);
    if (commentIdx >= 0) {
      builder.add(abs(commentIdx + 1), abs(lineText.length), Decoration.mark({ class: 'cm-mdl-comment' }));
    }
    return;
  }

  const [, fieldName, id, optMarker, colonPart] = lineMatch;

  // Field name.
  const fieldFrom = abs(indent);
  const fieldTo = fieldFrom + fieldName.length;
  builder.add(fieldFrom, fieldTo, Decoration.mark({ class: 'cm-mdl-field' }));

  let pos = indent + fieldName.length;

  // Optional id between field name and colon (e.g. F-1.1).
  if (id) {
    const idFrom = abs(pos + 1); // +1 for the space
    const idTo = idFrom + id.length;
    builder.add(idFrom, idTo, Decoration.mark({ class: 'cm-mdl-block-id' }));
    pos += 1 + id.length;
  }

  // Optional ? marker.
  if (optMarker) {
    builder.add(abs(pos), abs(pos + 1), Decoration.mark({ class: 'cm-mdl-punct' }));
    pos += 1;
  }

  // Colon — last char of colonPart (colonPart matches \s*:).
  const colonPos = pos + colonPart.length - 1;
  builder.add(abs(colonPos), abs(colonPos + 1), Decoration.mark({ class: 'cm-mdl-punct' }));
  pos += colonPart.length;

  // Inline comment: first " #" after the colon.
  const commentOffset = lineText.indexOf(' #', pos);
  const valueEnd = commentOffset >= 0 ? commentOffset : lineText.length;

  if (commentOffset >= 0) {
    builder.add(abs(commentOffset + 1), abs(lineText.length), Decoration.mark({ class: 'cm-mdl-comment' }));
  }

  // Pipe separators in union types (e.g. "a | b | c").
  const valueStart = pos;
  const valuePart = lineText.slice(valueStart, valueEnd);
  let pipeIdx = valuePart.indexOf('|');
  while (pipeIdx >= 0) {
    const absIdx = valueStart + pipeIdx;
    builder.add(abs(absIdx), abs(absIdx + 1), Decoration.mark({ class: 'cm-mdl-punct' }));
    pipeIdx = valuePart.indexOf('|', pipeIdx + 1);
  }
};

const buildDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const { state } = view;

  // Frontmatter: detect YAML block at document start, delimited by ---.
  const docText = state.doc.toString();
  const fmMatch = docText.match(/^---\n([\s\S]*?\n)---(?:\n|$)/);
  if (fmMatch) {
    // Opening ---.
    builder.add(0, 3, Decoration.mark({ class: 'cm-mdl-fence-tick' }));

    // Key-value lines inside frontmatter.
    const fmContent = fmMatch[1];
    let lineOffset = 4; // skip '---\n'
    for (const line of fmContent.split('\n')) {
      if (line.trim()) {
        decorateLine(builder, line, lineOffset);
      }
      lineOffset += line.length + 1;
    }

    // Closing ---.
    const closeFrom = 4 + fmMatch[1].length;
    builder.add(closeFrom, closeFrom + 3, Decoration.mark({ class: 'cm-mdl-fence-tick' }));
  }

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== 'CodeInfo') {
        return;
      }

      // Only handle ```mdl fences.
      if (state.doc.sliceString(node.from, node.to).trim() !== 'mdl') {
        return;
      }

      // Color ``` ticks + "mdl" keyword in muted grey.
      const tickFrom = node.from - 3;
      if (tickFrom >= 0) {
        builder.add(tickFrom, node.to, Decoration.mark({ class: 'cm-mdl-fence-tick' }));
      }

      // Find the CodeText sibling that holds the block body.
      let child = node.node.parent?.firstChild ?? null;
      while (child && child.name !== 'CodeText') {
        child = child.nextSibling ?? null;
      }
      if (!child) {
        return;
      }

      const bodyFrom = child.from;
      const bodyText = state.doc.sliceString(bodyFrom, child.to);
      const lines = bodyText.split('\n');
      let lineOffset = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineFrom = bodyFrom + lineOffset;

        if (i === 0) {
          // First body line: "<blockType> [id][: label]"
          // e.g. "type Color", "feat F-1: Start Game", "test T-1: description"
          const headerMatch = line.match(/^(\s*)(\w+)(?:\s+([\w][\w.\-]*))?(\s*:\s*)?(.*)?$/);
          if (headerMatch) {
            const [, leadingSpace, blockType, id, colon, label] = headerMatch;
            const color = BLOCK_TYPE_COLORS[blockType];
            if (color) {
              // Block type keyword.
              const typeFrom = lineFrom + leadingSpace.length;
              const typeTo = typeFrom + blockType.length;
              builder.add(typeFrom, typeTo, Decoration.mark({ class: `cm-mdl-block-${blockType}` }));

              // Identifier (e.g. F-1, T-1, Color) — white/bright so it stands out.
              if (id) {
                const idFrom = typeTo + 1; // +1 for the space
                const idTo = idFrom + id.length;
                builder.add(idFrom, idTo, Decoration.mark({ class: 'cm-mdl-block-id' }));

                // Label after colon — muted.
                if (colon && label) {
                  const labelFrom = idTo + colon.length;
                  builder.add(labelFrom, lineFrom + line.length, Decoration.mark({ class: 'cm-mdl-block-header' }));
                }
              }
            }
          }
        } else {
          decorateLine(builder, line, lineFrom);
        }

        lineOffset += line.length + 1; // +1 for '\n'
      }
    },
  });

  return builder.finish();
};

/**
 * Decorates Deus mdl fenced blocks:
 *   - Mutes the ``` ticks and `mdl` keyword (slate-500)
 *   - Colors the block type keyword on the first body line (per-type hue)
 *   - Colors field names in block body lines (blue-400)
 *   - Colors comments in block body lines (green-400, italic)
 */
export const mdlFenceHighlight: Extension = [
  theme,
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    { decorations: (instance) => instance.decorations },
  ),
];
