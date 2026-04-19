//
// Copyright 2026 DXOS.org
//

import { type Diagnostic, linter } from '@codemirror/lint';
import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { log } from '@dxos/log';
import { safeParseJson, trim } from '@dxos/util';

const DEFAULT_INSTRUCTIONS = trim`
  Proofread the input text below.
  Identify typos and grammatical errors. 
  Return ONLY a valid JSON array of objects with fields: "original" (string), "replacement" (string), "context" (string, 3-5 words around match).
  --
`;

export type AssistantOptions = {
  /**
   * Invoke the language model with the given prompt and return the raw text response.
   */
  generate: (request: { instructions: string; content: string }) => Promise<string>;
  /**
   * Instructions to use for the language model.
   */
  instructions?: string;
};

const underline = (color: string) => {
  const svg = trim`
    <svg xmlns="http://www.w3.org/2000/svg" width="6" height="3">
      <path d="m0 3 l2 -2 l1 0 l2 2 l1 0" stroke="${color}" fill="none" stroke-width="1"/>
    </svg>
  `;

  return `url('data:image/svg+xml;base64,${btoa(svg)}') !important`;
};

export const assistant = (options: AssistantOptions): Extension[] => {
  const styles = getComputedStyle(document.documentElement);
  const style = {
    info: styles.getPropertyValue('--color-green-500').trim(),
    warning: styles.getPropertyValue('--color-orange-500').trim(),
    error: styles.getPropertyValue('--color-rose-500').trim(),
  };

  return [
    assistantLinter(options),
    EditorView.baseTheme({
      // '.cm-lintRange': {
      // backgroundImage: 'none !important',
      // textDecorationSkipInk: 'none',
      // },
      '.cm-lintRange-info': {
        backgroundImage: underline(style.info),
        // textDecoration: 'underline wavy var(--color-info-text)',
      },
      '.cm-lintRange-warning': {
        backgroundImage: underline(style.warning),
        // textDecoration: 'underline wavy var(--color-warning-text)',
      },
      '.cm-lintRange-error': {
        backgroundImage: underline(style.error),
        // textDecoration: 'underline wavy var(--color-error-text)',
      },
    }),
  ];
};

//
// Linter
//

type Suggestion = {
  original: string;
  replacement: string;
  context: string;
};

const isSuggestion = (value: unknown): value is Suggestion =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Suggestion).original === 'string' &&
  typeof (value as Suggestion).replacement === 'string' &&
  typeof (value as Suggestion).context === 'string';

/**
 * Find the index of `original` within `content`, using `context` to disambiguate when there are multiple occurrences.
 */
const findSuggestionIndex = (content: string, suggestion: Suggestion): number => {
  const firstIdx = content.indexOf(suggestion.original);
  if (firstIdx === -1) {
    return -1;
  }

  // Check for duplicate occurrences; use context to disambiguate.
  const secondIdx = content.indexOf(suggestion.original, firstIdx + 1);
  if (secondIdx === -1) {
    return firstIdx;
  }

  // Find the occurrence whose surrounding text best matches the context.
  const contextIdx = content.indexOf(suggestion.context);
  if (contextIdx !== -1) {
    const contextEnd = contextIdx + suggestion.context.length;
    if (secondIdx >= contextIdx && secondIdx <= contextEnd) {
      return secondIdx;
    }
  }

  return firstIdx;
};

const assistantLinter = ({ generate, instructions = DEFAULT_INSTRUCTIONS }: AssistantOptions) =>
  linter(
    async (view) => {
      try {
        const content = view.state.doc.toString();
        const result = await generate({ instructions, content });

        const [match] = result.match(/\[.*\]/s) ?? [];
        const parsed = match ? safeParseJson<unknown[]>(match, []) : [];
        const suggestions = Array.isArray(parsed) ? parsed.filter(isSuggestion) : [];
        if (suggestions && suggestions.length > 0) {
          log.debug('assistant suggestions', { count: suggestions.length });
          const diagnostics: Diagnostic[] = [];
          for (const suggestion of suggestions) {
            const idx = findSuggestionIndex(content, suggestion);
            if (idx !== -1) {
              diagnostics.push({
                from: idx,
                to: idx + suggestion.original.length,
                severity: 'info',
                message: `Suggestion: ${suggestion.replacement}`,
                actions: [
                  {
                    name: 'Apply',
                    apply: (view, from, to) => {
                      view.dispatch({
                        changes: {
                          from,
                          to,
                          insert: suggestion.replacement,
                        },
                      });
                    },
                  },
                ],
              });
            }
          }

          return diagnostics;
        }
      } catch (err) {
        log.catch(err);
      }

      return [];
    },
    {
      // Debounce.
      delay: 3_000,
    },
  );
