//
// Copyright 2026 DXOS.org
//

import { type Diagnostic, linter } from '@codemirror/lint';
import { type Extension, StateField } from '@codemirror/state';
import { EditorView, type Tooltip, showTooltip } from '@codemirror/view';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { log } from '@dxos/log';

import { AssistantToolbar } from './AssistantToolbar';
import { Runtime } from 'effect';
import { unwrapExit } from '@dxos/effect';

export const assistant = (runtime: Runtime.Runtime<LanguageModel.LanguageModel>): Extension[] => {
  return [
    assistantState(runtime),
    assistantLinter(runtime),
    EditorView.baseTheme({
      '.cm-tooltip-assistant': {
        backgroundColor: 'transparent',
        border: 'none',
        padding: 0,
      },
    }),
  ];
};

//
// Toolbar State & Tooltip
//

const assistantState = (runtime: Runtime.Runtime<LanguageModel.LanguageModel>) =>
  StateField.define<Tooltip | null>({
    create: () => null,
    update: (tooltip, tr) => {
      if (tr.selection || tr.docChanged) {
        const { from, to } = tr.state.selection.main;
        if (from === to) {
          return null;
        } // No selection

        // Check if we should show tooltip
        // We return a tooltip object
        return {
          pos: from,
          above: true,
          // strictSide: true,
          class: 'cm-tooltip-assistant',
          create: (view) => {
            console.log('Creating tooltip');
            const dom = document.createElement('div');
            const root = createRoot(dom);

            // Mount React component
            root.render(React.createElement(AssistantToolbar, { view, runtime, from, to }));

            return {
              dom,
              destroy: () => {
                // Delay unmount to allow animations if needed, but for now just cleanup
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

const assistantLinter = (runtime: Runtime.Runtime<LanguageModel.LanguageModel>) =>
  linter(async (view) => {
    const text = view.state.doc.toString();
    if (text.length < 10) {
      return [];
    }

    // Run proofreading effect
    const prompt = `Proofread the following text. Identify typos and simple grammar mistakes. Return ONLY a valid JSON array of objects with fields: "original" (string), "replacement" (string), "context" (string, 3-5 words around match). Text: \n\n${text}`;

    // We mocked the model behavior in the story, but here we assume the model returns a string.
    // In a real implementation we would parse the JSON.
    // For this refactor, we just wire it up.

    // NOTE: This runs on every doc view update that triggers linter. Linter is debounced by default (750ms).

    try {
      const result = unwrapExit(
        await Effect.gen(function* () {
          const generated = yield* LanguageModel.generateText({ prompt });
          return generated.text;
        }).pipe(Runtime.runPromiseExit(runtime)),
      );

      // Parse result - assuming simpler mock response format for now or we build a robust parser
      // For the purpose of this task (UX demo), we can assume the mock returns a specific format or we parse it.
      // Let's assume the mock returns a JSON string.

      let suggestions: any[] = [];
      try {
        // Find JSON in response
        const match = result.match(/\[.*\]/s);
        if (match) {
          suggestions = JSON.parse(match[0]);
        }
      } catch (e) {
        // failed to parse
      }

      const diagnostics: Diagnostic[] = [];
      for (const s of suggestions) {
        // Naive finding of position
        const idx = text.indexOf(s.original);
        if (idx !== -1) {
          diagnostics.push({
            from: idx,
            to: idx + s.original.length,
            severity: 'info',
            message: `Suggestion: ${s.replacement}`,
            actions: [
              {
                name: 'Apply',
                apply: (view, from, to) => {
                  view.dispatch({ changes: { from, to, insert: s.replacement } });
                },
              },
            ],
          });
        }
      }
      return diagnostics;
    } catch (e) {
      log.error('Proofreading failed', { error: e });
      return [];
    }
  });
