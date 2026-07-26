//
// Copyright 2026 DXOS.org
//

import { Compartment, EditorSelection, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type expect as Expect } from 'vitest';

import { Text as EchoText, Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { invariant } from '@dxos/invariant';
import { Markdown } from '@dxos/plugin-markdown/types';
import { type Client } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Text } from '@dxos/schema';
import { automerge } from '@dxos/ui-editor';
import { Branch } from '@dxos/versioning';

import { useMarkdownEditorBinding } from '../hooks';
import { type ReviewScenario, type ScenarioStep } from './scenarios';

type Harness = ReturnType<typeof useMarkdownEditorBinding>;

/**
 * Headless executor for {@link ReviewScenario}s: mounts the REAL binding pipeline
 * (`useMarkdownEditorBinding`) through `renderHook` and a REAL `EditorView` wired the way
 * `MarkdownEditorContent` wires it — the automerge source and the binding's extensions in a live
 * compartment, reconfigured (never recreated) when the binding changes. The storybook executor runs
 * the same scenarios against the full plugin stack; this one runs them in a unit test.
 */
export const runScenarioHeadless = async (
  scenario: ReviewScenario,
  context: {
    client: Client;
    space: Space;
    identity: { did: string };
    wrapper: ({ children }: { children?: React.ReactNode }) => React.JSX.Element;
    expect: typeof Expect;
  },
): Promise<void> => {
  const { space, wrapper, expect } = context;

  // Seed.
  const doc = space.db.add(Markdown.make({ name: scenario.name, content: scenario.setup.content }));
  await space.db.flush({ indexes: true });
  const root = await doc.content.load();
  invariant(root, 'content not loaded');
  for (const suggestion of scenario.setup.suggestions ?? []) {
    const branch = await Branch.suggestion(doc, root, suggestion.creator);
    const binding = await Branch.bind(doc, branch);
    Obj.update(binding.object, () => {
      EchoText.update(binding.object, 'content', suggestion.content);
    });
    binding.dispose();
  }
  await space.db.flush({ indexes: true });

  // The binding pipeline, exactly as the article mounts it.
  let externalViewMode: 'preview' | 'source' | 'readonly' = 'preview';
  const { result, rerender } = renderHook(
    ({ viewMode }: { viewMode: 'preview' | 'source' | 'readonly' }) =>
      useMarkdownEditorBinding({
        object: doc,
        id: 'scenario',
        viewMode,
        onViewModeChange: (mode) => {
          externalViewMode = mode;
        },
        diffView: undefined,
      }),
    { wrapper, initialProps: { viewMode: externalViewMode } },
  );

  const settled = async () => {
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
        // Suggesting is settled only once the editor is off the readonly wait (the branch bound).
        if (result.current.activeReviewMode === 'suggesting') {
          expect(result.current.viewMode).not.toBe('readonly');
        }
      },
      { timeout: 10_000 },
    );
  };
  await settled();

  // The editor, wired like MarkdownEditorContent: one view, a live compartment for everything that
  // varies with the binding. The subject's accessor swaps through the compartment on rebind.
  const dynamic = new Compartment();
  const subjectText = (): Text.Text => {
    const subject = result.current.subject;
    invariant(Obj.instanceOf(Text.Text, subject) || Obj.instanceOf(Markdown.Document, subject), 'unexpected subject');
    const text = Obj.instanceOf(Markdown.Document, subject) ? subject.content.target : subject;
    invariant(text, 'subject text not loaded');
    return text;
  };
  const buildDynamic = () => [
    automerge(Doc.createAccessor(subjectText(), ['content'])),
    EditorView.editable.of(result.current.viewMode !== 'readonly'),
    result.current.extensions ?? [],
  ];
  const view = new EditorView({
    doc: result.current.initialValue ?? '',
    extensions: [dynamic.of(buildDynamic())],
  });
  const reconfigure = () => view.dispatch({ effects: dynamic.reconfigure(buildDynamic()) });
  const flush = () => new Promise((resolve) => setTimeout(resolve, 50));

  try {
    for (const [index, step] of scenario.steps.entries()) {
      const label = `${scenario.name} step ${index + 1} (${step.kind})`;
      switch (step.kind) {
        case 'select-mode': {
          act(() => {
            result.current.selectViewMode(
              step.mode === 'suggesting'
                ? { kind: 'contributed', reviewMode: 'suggesting' }
                : { kind: 'builtin', viewMode: step.viewMode ?? (step.mode === 'viewing' ? 'readonly' : 'preview') },
            );
          });
          rerender({ viewMode: externalViewMode });
          await settled();
          rerender({ viewMode: externalViewMode });
          reconfigure();
          await flush();
          break;
        }
        case 'type': {
          const at = view.state.doc.toString().indexOf(step.at);
          invariant(at >= 0, `${label}: anchor not found`);
          view.dispatch({
            changes: { from: at, insert: step.text },
            selection: EditorSelection.cursor(at + step.text.length),
            annotations: Transaction.userEvent.of('input.type'),
          });
          await flush();
          break;
        }
        case 'delete': {
          const from = view.state.doc.toString().indexOf(step.text);
          invariant(from >= 0, `${label}: text not found`);
          view.dispatch({
            changes: { from, to: from + step.text.length },
            annotations: Transaction.userEvent.of('delete.backward'),
          });
          await flush();
          break;
        }
        case 'expect-editable': {
          expect(result.current.viewMode !== 'readonly', label).toBe(step.editable);
          break;
        }
        case 'expect-doc': {
          const text = view.state.doc.toString();
          if (step.contains !== undefined) {
            expect(text, label).toContain(step.contains);
          }
          if (step.lacks !== undefined) {
            expect(text, label).not.toContain(step.lacks);
          }
          break;
        }
        case 'expect-main': {
          await waitFor(
            () => {
              const text = root.content;
              if (step.contains !== undefined) {
                expect(text, label).toContain(step.contains);
              }
              if (step.lacks !== undefined) {
                expect(text, label).not.toContain(step.lacks);
              }
            },
            { timeout: 5_000 },
          );
          break;
        }
        case 'expect-own-branch': {
          await waitFor(
            () => {
              const branch = doc.history?.branches.find(
                (candidate) =>
                  candidate.status === 'active' &&
                  candidate.kind === 'suggestion' &&
                  candidate.creator === context.identity.did,
              );
              invariant(branch, `${label}: own branch missing`);
              expect(view.state.doc.toString(), label).toContain(step.contains);
            },
            { timeout: 5_000 },
          );
          break;
        }
        case 'expect-own-change': {
          // Headless proxy for the tracked-change decoration: in Suggesting the editor document IS the
          // branch, so the change appears in the doc while main lacks it (asserted by expect-main).
          if (step.contains) {
            expect(view.state.doc.toString(), label).toContain(step.contains);
          }
          if (step.none) {
            const own = doc.history?.branches.find(
              (candidate) =>
                candidate.status === 'active' &&
                candidate.kind === 'suggestion' &&
                candidate.creator === context.identity.did,
            );
            expect(own, label).toBeUndefined();
          }
          break;
        }
      }
    }
  } finally {
    view.destroy();
  }
};

export type { ScenarioStep };
