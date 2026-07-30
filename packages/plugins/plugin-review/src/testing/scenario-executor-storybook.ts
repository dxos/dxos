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
  // Both the trigger's accessible name AND its icon track the active item (applyActive), so locate it
  // by testId — any other dropdown on the page (a message's hover toolbar) would otherwise be picked
  // up by a structural "last menu-popup button" query.
  const trigger = await waitFor(
    () => {
      const found = canvasElement.querySelector('[data-testid="editor.toolbar.viewMode"]');
      invariant(found instanceof HTMLElement, 'view-mode dropdown not found');
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

  // Mount settle: the editor shows the seeded content (or merely mounts, when seeded empty).
  const marker = scenario.setup.content.split('\n').find((line) => line.trim().length > 0);
  await waitFor(() => expect(findView(canvasElement).state.doc.toString()).toContain(marker ?? ''), {
    timeout: 20_000,
  });

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
        // The dropdown returns focus to its trigger on close; the article must hand it back to the
        // editor so the caret survives every mode switch (DOM-tier invariant; headless cannot see it).
        await waitFor(
          async () => {
            const active = canvasElement.ownerDocument.activeElement;
            await expect(
              !!active && !!active.closest('.cm-editor'),
              `${label}: editor lost focus to ${active?.tagName}`,
            ).toBe(true);
          },
          { timeout: 5_000 },
        );
        break;
      }
      case 'type': {
        const view = findView(canvasElement);
        const at = step.at !== undefined ? view.state.doc.toString().indexOf(step.at) : view.state.doc.length;
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
      case 'expect-clean-insert': {
        await waitFor(
          async () => {
            const widgets = Array.from(canvasElement.querySelectorAll('.cm-suggest-insert'));
            const inserts = widgets.map((node) => node.textContent ?? '').join(' ');
            await expect(inserts, label).toContain(step.text);
            await expect(canvasElement.querySelectorAll('.cm-suggest-delete'), label).toHaveLength(0);
            if (step.before !== undefined) {
              const { before } = step;
              // Rendered order: the proposal widget precedes the text the user typed at its anchor.
              const widget = widgets.find((node) => node.textContent?.includes(step.text));
              invariant(widget, `${label}: suggestion widget missing`);
              const lineText = widget.closest('.cm-line')?.textContent ?? '';
              const widgetAt = lineText.indexOf(step.text);
              const beforeAt = lineText.indexOf(before);
              await expect(
                beforeAt === -1 || (widgetAt !== -1 && widgetAt < beforeAt),
                `${label}: proposal rendered after the typed text (${JSON.stringify(lineText)})`,
              ).toBe(true);
              // The change bar must not tint the host line's own text: a block-insert proposal gets
              // ONE gutter bar whose height is capped to the proposal's rows (never full line height).
              const bars = Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-change-bar'));
              await expect(bars, `${label}: gutter bars`).toHaveLength(1);
              await expect(
                bars[0].style.height.includes('lh'),
                `${label}: gutter bar not row-capped (would tint the host line's own text)`,
              ).toBe(true);
            }
          },
          { timeout: 15_000 },
        );
        break;
      }
      case 'expect-one-suggestion': {
        await waitFor(
          async () => {
            // The inline overlay renders the pair as ONE hunk (a single insert widget carrying the
            // whole change), and the companion shows exactly one card.
            const widgets = Array.from(canvasElement.querySelectorAll('.cm-suggest-insert'));
            await expect(widgets, `${label}: overlay hunks`).toHaveLength(1);
            await expect(widgets[0].textContent ?? '', label).toContain(step.containing);
            const cards = Array.from(canvasElement.querySelectorAll('[data-testid="thread.message"]')).filter((tile) =>
              tile.querySelector('[data-testid="thread.message.accept-change"]'),
            );
            await expect(cards, `${label}: companion cards`).toHaveLength(1);
            await expect(cards[0].textContent ?? '', label).toContain(step.containing);
          },
          { timeout: 15_000 },
        );
        break;
      }
      case 'expect-count': {
        await waitFor(
          async () => {
            const text = step.where === 'doc' ? findView(canvasElement).state.doc.toString() : rootContent();
            await expect(text.split(step.text).length - 1, label).toBe(step.count);
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
