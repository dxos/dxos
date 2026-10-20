//
// Copyright 2026 DXOS.org
//

import { RangeSetBuilder } from '@codemirror/state';
import { type EditorView, GutterMarker, gutter } from '@codemirror/view';

import { type DecisionModel } from '../ChangelogGraph/index.ts';

/** A block declaration line, `feat F-1: …` or `  req F-1.2: …`, captured as its id. */
const BLOCK_DECLARATION = /^\s*[a-z]+\s+([A-Za-z][\w.-]*)\s*:/;

/** Mirrors the cards: a person's chip is solid, an agent's dashed, so the gutter reads like the graph. */
const CHIP_CLASSES = {
  user: 'bg-sky-surface text-sky-fg',
  agent: 'border border-dashed border-violet-border text-violet-text',
};

/** The decisions that name each block in `affects:`, keyed by block id. */
export const attachDecisions = (decisions: readonly DecisionModel[]): Map<string, DecisionModel[]> => {
  const byBlock = new Map<string, DecisionModel[]>();
  for (const decision of decisions) {
    for (const block of decision.entry.affects) {
      byBlock.set(block, [...(byBlock.get(block) ?? []), decision]);
    }
  }
  return byBlock;
};

class DecisionsMarker extends GutterMarker {
  constructor(
    readonly decisions: readonly DecisionModel[],
    readonly onSelect?: (id: string) => void,
  ) {
    super();
  }

  override eq(other: GutterMarker): boolean {
    return (
      other instanceof DecisionsMarker &&
      other.decisions.map(({ id }) => id).join() === this.decisions.map(({ id }) => id).join()
    );
  }

  override toDOM(): Node {
    const row = document.createElement('div');
    row.className = 'flex flex-wrap justify-end gap-0.5 py-0.5';
    for (const { id, actor, entry, supersededBy } of this.decisions) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = id;
      chip.title = `${id} · ${entry.by ?? ''}\n${entry.title}`;
      chip.dataset.decision = id;
      chip.dataset.testid = 'spec-changelog.gutter-chip';
      chip.className = [
        'px-1 rounded-sm text-xs leading-4 font-mono cursor-pointer',
        actor ? CHIP_CLASSES[actor] : '',
        supersededBy ? 'line-through opacity-60' : '',
      ].join(' ');
      chip.addEventListener('click', () => this.onSelect?.(id));
      row.appendChild(chip);
    }
    return row;
  }
}

/** A gutter beside each spec block naming the decisions that constrain it; a chip selects its decision. */
export const decisionGutter = (decisions: readonly DecisionModel[], onSelect?: (id: string) => void) => {
  const byBlock = attachDecisions(decisions);
  return gutter({
    class: 'cm-decision-gutter min-w-24',
    markers: (view: EditorView) => {
      const builder = new RangeSetBuilder<GutterMarker>();
      for (let number = 1; number <= view.state.doc.lines; number++) {
        const line = view.state.doc.line(number);
        const attached = byBlock.get(BLOCK_DECLARATION.exec(line.text)?.[1] ?? '');
        if (attached) {
          builder.add(line.from, line.from, new DecisionsMarker(attached, onSelect));
        }
      }
      return builder.finish();
    },
  });
};
