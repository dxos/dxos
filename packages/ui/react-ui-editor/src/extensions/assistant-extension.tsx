//
// Copyright 2026 DXOS.org
//

import { type Diagnostic, linter } from '@codemirror/lint';
import { type Extension, StateField } from '@codemirror/state';
import { EditorView, type Tooltip, showTooltip } from '@codemirror/view';
import { createRoot } from 'react-dom/client';

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
    assistantState(options),
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
// Toolbar State & Tooltip
//

const assistantState = (options: AssistantOptions) =>
  StateField.define<Tooltip | null>({
    create: () => null,
    update: (tooltip, tr): Tooltip | null => {
      if (tr.selection || tr.docChanged) {
        const { from, to } = tr.state.selection.main;
        if (from === to) {
          return null;
        }

        return {
          pos: from,
          above: false,
          strictSide: true,
          create: (view) => {
            const dom = document.createElement('div');
            const root = createRoot(dom);
            return {
              dom,
              destroy: () => {
                setTimeout(() => root.unmount(), 0);
              },
            };
          },
        };
      }

      return tooltip;
    },
    provide: (f) => showTooltip.from(f),
  });

//
// Linter
//

const assistantLinter = ({ generate, instructions = DEFAULT_INSTRUCTIONS }: AssistantOptions) =>
  linter(
    async (view) => {
      try {
        const content = view.state.doc.toString();
        const result = await generate({ instructions, content });

        const [match] = result.match(/\[.*\]/s) ?? [];
        const suggestions = match && safeParseJson<any[]>(match, []);
        if (suggestions) {
          log.debug('assistant suggestions', { count: suggestions.length });
          const diagnostics: Diagnostic[] = [];
          for (const suggestion of suggestions) {
            const idx = content.indexOf(suggestion.original);
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
