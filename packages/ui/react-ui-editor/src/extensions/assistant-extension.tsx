//
// Copyright 2026 DXOS.org
//

import { type Diagnostic, linter } from '@codemirror/lint';
import { type Extension, StateField } from '@codemirror/state';
import { EditorView, type Tooltip, showTooltip } from '@codemirror/view';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Runtime from 'effect/Runtime';
import { createRoot } from 'react-dom/client';

import { unwrapExit } from '@dxos/effect';
import { log } from '@dxos/log';
import { trim } from '@dxos/util';

export type AssistantOptions = {
  runtime: Runtime.Runtime<LanguageModel.LanguageModel>;
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

// TODO(burdon): Make pluggable.
const createPrompt = (text: string) => trim`
  Proofread the following text. 
  Identify typos and simple grammar mistakes. 
  Return ONLY a valid JSON array of objects with fields: "original" (string), "replacement" (string), "context" (string, 3-5 words around match).
  TEXT:\n\n${text}
`;

const assistantLinter = ({ runtime }: AssistantOptions) =>
  linter(async (view) => {
    // TODO(burdon): Skip if empty.
    const text = view.state.doc.toString();

    try {
      const result = unwrapExit(
        await Effect.gen(function* () {
          const response = yield* LanguageModel.generateText({ prompt: createPrompt(text) });
          log.info('response', { response });
          return response.text;
        }).pipe(Runtime.runPromiseExit(runtime)),
      );

      let suggestions: any[] = [];
      try {
        // Find JSON in response
        const match = result.match(/\[.*\]/s);
        if (match) {
          suggestions = JSON.parse(match[0]);
        }
      } catch (err) {
        log.catch(err);
      }

      log.info('suggestions', { result, suggestions });

      const diagnostics: Diagnostic[] = [];
      for (const suggestion of suggestions) {
        const idx = text.indexOf(suggestion.original);
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
    } catch (error) {
      log.catch(error);
      return [];
    }
  });
