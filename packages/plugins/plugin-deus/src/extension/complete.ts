import { CompletionContext, CompletionResult, autocompletion } from '@codemirror/autocomplete';
import { Extension } from '@codemirror/state';

// Standard fields for each block type.
// In future this will be derived from resolved `ext` definitions.
const BLOCK_FIELDS: Record<string, string[]> = {
  ext:       ['uri', 'desc', 'extends', 'fields', 'adds-fields', 'nesting', 'inline-prose', 'example'],
  type:      ['desc', 'fields', 'variants', 'invariants', 'extends'],
  op:        ['desc', 'input', 'output', 'errors', 'effects', 'requires', 'note'],
  feat:      ['desc', 'req'],
  test:      ['given', 'when', 'then', 'tags'],
  component: ['desc', 'props', 'state', 'slots', 'actions', 'emits', 'layout'],
  service:   ['desc', 'loading', 'ops', 'errors', 'note'],
  db:        ['desc', 'backend', 'entities', 'queries', 'note'],
};

/**
 * Returns field-name completions when inside a Deus fenced block.
 * Detects which block type encloses the cursor and suggests its known fields.
 */
const mdlCompletionSource = (context: CompletionContext): CompletionResult | null => {
  const { state, pos } = context;
  const text = state.doc.toString();

  // Find the innermost open fenced block above the cursor.
  const before = text.slice(0, pos);
  const openFences = [...before.matchAll(/^```(\w+)/gm)];
  const closeFences = [...before.matchAll(/^```\s*$/gm)];
  if (openFences.length === 0 || openFences.length <= closeFences.length) {
    return null; // not inside a block
  }

  const lastOpen = openFences[openFences.length - 1];
  const blockType = lastOpen[1];
  const fields = BLOCK_FIELDS[blockType];
  if (!fields) {
    return null;
  }

  // Only complete at the start of a line (field name position).
  const lineStart = before.lastIndexOf('\n') + 1;
  const partial = before.slice(lineStart);
  if (partial.includes(':')) {
    return null; // already past the key
  }

  const word = context.matchBefore(/\w[\w-]*/);
  if (!word && !context.explicit) {
    return null;
  }

  return {
    from: word ? word.from : pos,
    options: fields.map((field) => ({
      label: field,
      type: 'property',
      apply: `${field}: `,
    })),
  };
};

/**
 * Autocompletion extension for Deus .mdl documents.
 */
export const mdlComplete: Extension = autocompletion({ override: [mdlCompletionSource] });
