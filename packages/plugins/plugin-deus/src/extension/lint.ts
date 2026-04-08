import { linter, Diagnostic } from '@codemirror/lint';
import { syntaxTree } from '@codemirror/language';
import { EditorView } from '@codemirror/view';

// Block types declared in the core + standard dialect.
// In future this will be derived from the Extensions table in the document.
const KNOWN_BLOCK_TYPES = new Set([
  'ext', 'type', 'op', 'feat', 'test', 'component', 'service', 'db',
]);

/**
 * Extracts block headers from the raw document text.
 * Returns { type, id, from, to } for each fenced block opening.
 */
const parseBlockHeaders = (text: string): { type: string; id: string; from: number; to: number }[] => {
  const results: { type: string; id: string; from: number; to: number }[] = [];
  const regex = /^```(\w+)(?:\s+([^\n:]+))?(?::\s*[^\n]*)?\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    results.push({ type: match[1], id: match[2]?.trim() ?? '', from: match.index, to: match.index + match[0].length });
  }
  return results;
};

/**
 * Lint extension for Deus .mdl documents.
 *
 * Checks:
 *   - Unknown block types → error
 *   - (future) Missing required fields → error
 *   - (future) Unresolved cross-references → error
 */
export const mdlLint = linter((view: EditorView): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const text = view.state.doc.toString();
  const headers = parseBlockHeaders(text);

  for (const { type, from, to } of headers) {
    if (!KNOWN_BLOCK_TYPES.has(type)) {
      diagnostics.push({
        from,
        to,
        severity: 'error',
        message: `Unknown block type "${type}". Declare it in the Extensions table or define it with an \`ext\` block.`,
      });
    }
  }

  return diagnostics;
});
