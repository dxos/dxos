//
// Copyright 2026 DXOS.org
//

import { expect, userEvent, waitFor, within } from 'storybook/test';

import { invariant } from '@dxos/invariant';
import { type Markdown } from '@dxos/plugin-markdown/types';
import { EditorView } from '@dxos/ui-editor';
import { Branch } from '@dxos/versioning';

import { type ReviewScenario, type ScenarioStep } from './scenarios';

/**
 * Open the editor view-mode dropdown and pick an entry by label. The review mode is folded into this
 * single dropdown: Source/Markdown ⇒ editing, Read-only ⇒ viewing, Suggesting ⇒ suggesting.
 */
export const selectViewMode = async (canvasElement: HTMLElement, label: string): Promise<void> => {
  const body = within(canvasElement.ownerDocument.body);
  // Both the trigger's accessible name AND its icon track the active item (applyActive), so locate
  // it structurally: the view-mode dropdown is the last menu-popup button in the editor toolbar.
  const trigger = await waitFor(
    () => {
      const buttons = canvasElement.querySelectorAll('button[aria-haspopup="menu"]');
      const found = buttons[buttons.length - 1];
      invariant(found instanceof HTMLElement);
      return found;
    },
    { timeout: 15_000 },
  );
  await userEvent.click(trigger);
  // Scope to the open menu: the trigger renders the ACTIVE item's label too, so a body-wide text
  // lookup matches both once that mode is selected.
  const menu = await body.findByRole('menu');
  await userEvent.click(await within(menu).findByText(label));
};

const findView = (canvasElement: HTMLElement): EditorView => {
  const content = canvasElement.querySelector<HTMLElement>('.cm-content');
  invariant(content, 'editor content not mounted');
  const view = EditorView.findFromDOM(content);
  invariant(view, 'editor view not found');
  return view;
};

/** Concatenated text of the self tracked-change insertions (Suggesting mode) rendered in the editor. */
const trackInserts = (canvasElement: HTMLElement): string =>
  Array.from(canvasElement.querySelectorAll('.cm-track-insert'))
    .map((node) => node.textContent ?? '')
    .join('');

const modeLabel = (step: Extract<ScenarioStep, { kind: 'select-mode' }>): string => {
  switch (step.mode) {
    case 'suggesting':
      return 'Suggesting';
    case 'viewing':
      return 'Read-only';
    case 'editing':
      return step.viewMode === 'source' ? 'Source' : 'Markdown';
  }
};

/**
 * Storybook executor for {@link ReviewScenario}s: drives the SAME scenario objects the headless
 * executor runs, but through the full plugin stack — the real toolbar dropdown, the mounted
 * CodeMirror view, and the live decorations. Setup (content + foreign suggestions) is seeded by the
 * story's decorator from the scenario, so the two tiers start from identical state.
 */
export const runScenarioStorybook = async (
  scenario: ReviewScenario,
  context: {
    canvasElement: HTMLElement;
    /** The story's seeded document (main + branch registry live here). */
    doc: () => Markdown.Document;
  },
): Promise<void> => {
  const { canvasElement, doc } = context;
  const foreignCreators = new Set((scenario.setup.suggestions ?? []).map((suggestion) => suggestion.creator));
  const ownBranch = () =>
    doc().history?.branches.find(
      (candidate) =>
        candidate.status === 'active' &&
        candidate.kind === 'suggestion' &&
        candidate.creator !== undefined &&
        !foreignCreators.has(candidate.creator),
    );
  const rootContent = () => {
    const root = doc().content.target;
    invariant(root, 'root text not loaded');
    return root.content;
  };

  // Mount settle: the editor shows the seeded content.
  const marker = scenario.setup.content.split('\n').find((line) => line.trim().length > 0);
  invariant(marker, 'scenario content is empty');
  await waitFor(() => expect(findView(canvasElement).state.doc.toString()).toContain(marker), { timeout: 20_000 });

  for (const [index, step] of scenario.steps.entries()) {
    const label = `${scenario.name} step ${index + 1} (${step.kind})`;
    switch (step.kind) {
      case 'select-mode': {
        await selectViewMode(canvasElement, modeLabel(step));
        // Settle on the posture's editability — for Suggesting this also waits out the branch swap.
        const editable = step.mode !== 'viewing';
        await waitFor(() => expect(findView(canvasElement).state.readOnly, label).toBe(!editable), {
          timeout: 15_000,
        });
        break;
      }
      case 'type': {
        const view = findView(canvasElement);
        const at = view.state.doc.toString().indexOf(step.at);
        invariant(at >= 0, `${label}: anchor not found`);
        view.focus();
        view.dispatch({
          changes: { from: at, insert: step.text },
          selection: { anchor: at + step.text.length },
          userEvent: 'input.type',
        });
        break;
      }
      case 'delete': {
        const view = findView(canvasElement);
        const from = view.state.doc.toString().indexOf(step.text);
        invariant(from >= 0, `${label}: text not found`);
        view.dispatch({
          changes: { from, to: from + step.text.length },
          userEvent: 'delete.backward',
        });
        break;
      }
      case 'expect-editable': {
        await waitFor(() => expect(findView(canvasElement).state.readOnly, label).toBe(!step.editable), {
          timeout: 15_000,
        });
        break;
      }
      case 'expect-doc': {
        await waitFor(
          async () => {
            const text = findView(canvasElement).state.doc.toString();
            if (step.contains !== undefined) {
              await expect(text, label).toContain(step.contains);
            }
            if (step.lacks !== undefined) {
              await expect(text, label).not.toContain(step.lacks);
            }
          },
          { timeout: 15_000 },
        );
        break;
      }
      case 'expect-main': {
        await waitFor(
          async () => {
            const text = rootContent();
            if (step.contains !== undefined) {
              await expect(text, label).toContain(step.contains);
            }
            if (step.lacks !== undefined) {
              await expect(text, label).not.toContain(step.lacks);
            }
          },
          { timeout: 15_000 },
        );
        break;
      }
      case 'expect-own-branch': {
        await waitFor(
          async () => {
            const branch = ownBranch();
            invariant(branch, `${label}: own branch missing`);
            const binding = await Branch.bind(doc(), branch);
            try {
              await expect(binding.object.content, label).toContain(step.contains);
            } finally {
              binding.dispose();
            }
          },
          { timeout: 15_000 },
        );
        break;
      }
      case 'expect-own-change': {
        if (step.contains !== undefined) {
          const { contains } = step;
          await waitFor(async () => expect(trackInserts(canvasElement), label).toContain(contains), {
            timeout: 15_000,
          });
        }
        if (step.none) {
          await waitFor(
            async () => {
              await expect(canvasElement.querySelectorAll('.cm-track-insert'), label).toHaveLength(0);
              await expect(ownBranch(), label).toBeUndefined();
            },
            { timeout: 15_000 },
          );
        }
        break;
      }
    }
  }
};
