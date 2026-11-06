//
// Copyright 2026 DXOS.org
//

import { type EditorState, RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

import { type DecisionModel, type QuestionModel, githubAvatarUrl } from '../ChangelogGraph/index.ts';

/** A block declaration line, `feat F-1: …` or `  req F-1.2: …`, captured as its id. */
const BLOCK_DECLARATION = /^\s*[a-z]+\s+([A-Za-z][\w.-]*)\s*:/;

/** Mirrors the cards: a person's chip is solid, an agent's dashed, so the margin reads like the graph. */
const CHIP_CLASSES = {
  user: 'bg-sky-surface text-sky-fg',
  agent: 'border border-dashed border-violet-border text-violet-text',
};

/** An open question reads as a prompt in the margin, whoever asked it. */
const QUESTION_CHIP_CLASSES = 'border border-warning-border text-warning-fg';

/** A changelog entry that can annotate a block: a decision, or a question about it. */
export type GutterItem = DecisionModel | QuestionModel;

/** Struck through: a decision something replaced, or a question that has its answer. */
const isSettled = (item: GutterItem): boolean =>
  item.kind === 'decision' ? item.supersededBy !== undefined : item.answer !== undefined;

/** The decisions and questions that name each block in `affects:`, keyed by block id. */
export const attachDecisions = (decisions: readonly GutterItem[]): Map<string, GutterItem[]> => {
  const byBlock = new Map<string, GutterItem[]>();
  for (const decision of decisions) {
    for (const block of decision.entry.affects) {
      byBlock.set(block, [...(byBlock.get(block) ?? []), decision]);
    }
  }
  return byBlock;
};

class DecisionsWidget extends WidgetType {
  constructor(
    readonly decisions: readonly GutterItem[],
    readonly onSelect?: (id: string) => void,
  ) {
    super();
  }

  override eq(other: DecisionsWidget): boolean {
    return other.decisions.map(({ id }) => id).join() === this.decisions.map(({ id }) => id).join();
  }

  override toDOM(): HTMLElement {
    // Floated, so the chips sit in the right margin of the line they annotate rather than pushing its text.
    const row = document.createElement('span');
    row.className = 'float-right flex flex-wrap justify-end gap-1 ms-4 select-none';
    for (const item of this.decisions) {
      const { id, actor, handle, entry } = item;
      const question = item.kind === 'question';
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.title = `${id} · ${entry.by ?? ''}\n${entry.title}`;
      chip.dataset.decision = id;
      chip.dataset.testid = 'spec-changelog.gutter-chip';
      chip.className = [
        'inline-flex items-center gap-1 px-1 rounded-sm text-xs leading-5 font-mono cursor-pointer',
        question ? QUESTION_CHIP_CLASSES : actor ? CHIP_CLASSES[actor] : '',
        isSettled(item) ? 'line-through opacity-60' : '',
      ].join(' ');
      const avatar = actor === 'user' && handle ? githubAvatarUrl(handle) : undefined;
      if (avatar) {
        const image = document.createElement('img');
        image.src = avatar;
        image.alt = '';
        image.className = 'size-4 rounded-full';
        chip.appendChild(image);
      }
      chip.appendChild(document.createTextNode(id));
      chip.addEventListener('click', () => this.onSelect?.(id));
      row.appendChild(chip);
    }
    return row;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

const buildDecorations = (
  state: EditorState,
  byBlock: Map<string, GutterItem[]>,
  onSelect?: (id: string) => void,
): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  for (let number = 1; number <= state.doc.lines; number++) {
    const line = state.doc.line(number);
    const attached = byBlock.get(BLOCK_DECLARATION.exec(line.text)?.[1] ?? '');
    if (attached) {
      builder.add(
        line.from,
        line.from,
        Decoration.widget({ widget: new DecisionsWidget(attached, onSelect), side: -1 }),
      );
    }
  }
  return builder.finish();
};

/**
 * Chips in the right margin of each spec block naming the decisions that constrain it and the questions about it; a
 * chip selects its entry.
 */
export const decisionGutter = (decisions: readonly GutterItem[], onSelect?: (id: string) => void) => {
  const byBlock = attachDecisions(decisions);
  return EditorView.decorations.compute(['doc'], (state) => buildDecorations(state, byBlock, onSelect));
};
