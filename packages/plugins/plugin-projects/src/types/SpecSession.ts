//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import * as Atom from 'effect/reactivity/Atom';

import type * as Translations from '@dxos/app-toolkit/Translations';
import { type SourceKey } from '@dxos/deus/review';

import { ProjectsNamespace } from '../namespace.ts';

/** The companion tabs of a spec, each switching between the views contributed to it. */
export const GROUPS = ['structure', 'decisions', 'review'] as const;

export type Group = (typeof GROUPS)[number];

/** The companion variant of a group's tab, which a plugin opens with `LayoutOperation.UpdateCompanion`. */
export const companionVariant = (group: Group): string => `spec-${group}`;

export const companionIcon: Record<Group, string> = {
  structure: 'ph--tree-structure--regular',
  decisions: 'ph--signpost--regular',
  review: 'ph--seal-check--regular',
};

export const companionLabel = (group: Group): Translations.Label => [
  `spec-companion.${group}.label`,
  { ns: ProjectsNamespace.key },
];

/** What diff mode compares the spec with: the base branch's merge base, or the last commit. */
export type DiffAgainst = 'base' | 'head';

/** What a spec's editor and its companion views share, wherever each is shown. */
export type State = {
  /** The view each companion tab shows, by group; a tab without one shows its first. */
  views: Partial<Record<Group, string>>;
  /** The group last asked for, which a panel showing every group at once (beside a static spec) shows. */
  focus?: Group;
  /** The evidence a review opened, which the review tab's code view shows. */
  evidence?: SourceKey;
  selectedVerdict?: string;
  /** The review the review view shows; undefined shows each item's newest verdict across the spec's reviews. */
  selectedReview?: string;
  selectedDecision?: string;
  /** What the editor compares the spec with; undefined outside diff mode. */
  diff?: DiffAgainst;
  /** Whether unchanged runs fold in diff mode. */
  fold: boolean;
};

/** One session per spec, keyed by its id or a static spec's source key; dropped once nothing shows it. */
export const session = Atom.family((id: string) => Atom.make<State>({ views: {}, fold: false }));

/** The editor each session's spec is open in, so a view can move it to an item. */
const editors = new Map<string, EditorView>();

export const registerEditor = (id: string, editor: EditorView): (() => void) => {
  editors.set(id, editor);
  return () => {
    if (editors.get(id) === editor) {
      editors.delete(id);
    }
  };
};

export const getEditor = (id: string): EditorView | undefined => editors.get(id);

/** A declaration line (`feat F-1: …`, `  req F-1.2: …`, `type Scene`) for the given id. */
const declarationOf = (id: string) =>
  new RegExp(`^\\s*[a-z]+\\s+${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?::|$)`);

/** Scrolls the session's editor to the declaration of `item`; false when no editor is open or it does not declare it. */
export const reveal = (id: string, item: string, focus = true): boolean => {
  const editor = editors.get(id);
  if (!editor) {
    return false;
  }
  const pattern = declarationOf(item);
  for (let number = 1; number <= editor.state.doc.lines; number++) {
    const line = editor.state.doc.line(number);
    if (pattern.test(line.text)) {
      editor.dispatch({
        selection: EditorSelection.cursor(line.from),
        effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
      });
      if (focus) {
        editor.focus();
      }
      return true;
    }
  }
  return false;
};
