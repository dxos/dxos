//
// Copyright 2026 DXOS.org
//

/**
 * Review scenarios as data: one definition, two executors. The headless executor drives the binding
 * pipeline plus a real `EditorView` in a unit test; the storybook executor drives the full plugin
 * stack in a play. Both import THE SAME scenario objects, so the tiers cannot drift — a new step kind
 * fails both executors at compile time until each interprets it.
 */

/** Initial state, seeded before the editor mounts. */
export type ScenarioSetup = {
  /** Main document content. */
  content: string;
  /** Foreign suggestion branches: full proposed content per author. */
  suggestions?: Array<{ creator: string; content: string }>;
};

export type ScenarioStep =
  /** Select a posture/view mode through the single dropdown gesture. */
  | { kind: 'select-mode'; mode: 'editing' | 'suggesting' | 'viewing'; viewMode?: 'preview' | 'source' | 'readonly' }
  /** Type text at the position of `at` (an anchor substring), or at the document end when omitted. */
  | { kind: 'type'; at?: string; text: string }
  /** Delete the given substring from the current editor document. */
  | { kind: 'delete'; text: string }
  // Expectations — checked by both executors.
  | { kind: 'expect-editable'; editable: boolean }
  /** The editor document (what the user sees as text) contains / lacks a substring. */
  | { kind: 'expect-doc'; contains?: string; lacks?: string }
  /** Main (the shared document) contains / lacks a substring. */
  | { kind: 'expect-main'; contains?: string; lacks?: string }
  /** The current user's suggestion branch contains a substring. */
  | { kind: 'expect-own-branch'; contains: string }
  /** Exact occurrence count of a substring — catches doubling, which `contains` cannot. */
  | { kind: 'expect-count'; where: 'doc' | 'main'; text: string; count: number }
  /**
   * The user's pending suggestion is a PURE insertion containing `text`: no hunk strikes existing
   * document text. Guards the doubled-text defect — a non-minimal hunk re-inserting unchanged text.
   * With `before`, the suggestion is also anchored BEFORE that (main) text — text typed at a trailing
   * suggestion's anchor lands after the proposal, never in front of it.
   */
  | { kind: 'expect-clean-insert'; text: string; before?: string }
  /** The user's own tracked change: contains a substring, or (`none`) no own change/branch exists. */
  | { kind: 'expect-own-change'; contains?: string; none?: boolean }
  /**
   * The user's pending suggestions form exactly ONE reviewable change containing `containing`.
   * Guards atomicity: a markdown delimiter pair (e.g. `**` … `**`) must review — and later apply —
   * as one unit, never as two half-pairs that would each leave broken syntax.
   */
  | { kind: 'expect-one-suggestion'; containing: string };

export type ReviewScenario = {
  name: string;
  setup: ScenarioSetup;
  steps: ScenarioStep[];
};

const CONTENT = ['# Notes', '', 'alpha bravo charlie delta.', ''].join('\n');
const BOB = ['# Notes', '', 'alpha bravo charlie delta.', '', 'Bob proposes this line.', ''].join('\n');

/**
 * Default-mode editing: typing goes to main, no review artifacts appear.
 */
export const editingScenario: ReviewScenario = {
  name: 'editing goes to main',
  setup: { content: CONTENT, suggestions: [{ creator: 'did:bob', content: BOB }] },
  steps: [
    { kind: 'expect-editable', editable: true },
    { kind: 'type', at: 'bravo', text: 'X' },
    { kind: 'expect-doc', contains: 'Xbravo' },
    { kind: 'expect-main', contains: 'Xbravo' },
    { kind: 'expect-own-change', none: true },
  ],
};

/**
 * Suggesting: typing goes to the own branch, renders as a tracked change, and main is untouched;
 * returning to editing keeps the edit visible as the user's suggestion while main stays clean.
 */
export const suggestingScenario: ReviewScenario = {
  name: 'suggesting goes to the own branch',
  setup: { content: CONTENT, suggestions: [{ creator: 'did:bob', content: BOB }] },
  steps: [
    { kind: 'select-mode', mode: 'suggesting' },
    { kind: 'expect-editable', editable: true },
    { kind: 'type', at: 'charlie', text: 'MINE ' },
    { kind: 'expect-own-change', contains: 'MINE' },
    { kind: 'expect-own-branch', contains: 'MINE' },
    { kind: 'expect-main', lacks: 'MINE' },
    { kind: 'select-mode', mode: 'editing', viewMode: 'preview' },
    { kind: 'expect-main', lacks: 'MINE' },
    { kind: 'expect-editable', editable: true },
  ],
};

/**
 * Deletion in Suggesting: the removed text survives on main, struck through for review.
 */
export const suggestingDeleteScenario: ReviewScenario = {
  name: 'suggesting deletion is a phantom, not a removal',
  setup: { content: CONTENT },
  steps: [
    { kind: 'select-mode', mode: 'suggesting' },
    { kind: 'delete', text: 'bravo ' },
    { kind: 'expect-doc', lacks: 'bravo' },
    { kind: 'expect-main', contains: 'bravo' },
    { kind: 'expect-own-branch', contains: 'alpha charlie' },
  ],
};

/**
 * The full ambient round-trip from an empty document: type on main, suggest, return to main, type
 * after the suggestion, re-enter Suggesting. Guards the two swap invariants — no content doubling on
 * any mode switch, and typing on main after a trailing suggestion lands at main's end.
 */
export const modeRoundTripScenario: ReviewScenario = {
  name: 'mode round-trip keeps main and the suggestion separate',
  setup: { content: '' },
  steps: [
    { kind: 'type', text: 'Hello\n' },
    { kind: 'expect-main', contains: 'Hello' },
    { kind: 'select-mode', mode: 'suggesting' },
    { kind: 'type', text: 'World\n' },
    { kind: 'expect-own-change', contains: 'World' },
    { kind: 'expect-own-branch', contains: 'World' },
    { kind: 'expect-main', lacks: 'World' },
    { kind: 'select-mode', mode: 'editing', viewMode: 'preview' },
    { kind: 'expect-clean-insert', text: 'World' },
    { kind: 'expect-count', where: 'doc', text: 'Hello', count: 1 },
    { kind: 'expect-count', where: 'main', text: 'Hello', count: 1 },
    { kind: 'expect-main', lacks: 'World' },
    { kind: 'type', text: 'After\n' },
    { kind: 'expect-main', contains: 'Hello\nAfter' },
    { kind: 'expect-count', where: 'main', text: 'World', count: 0 },
    { kind: 'expect-clean-insert', text: 'World', before: 'After' },
    { kind: 'select-mode', mode: 'suggesting' },
    { kind: 'expect-count', where: 'doc', text: 'World', count: 1 },
    { kind: 'expect-count', where: 'doc', text: 'Hello', count: 1 },
    { kind: 'expect-count', where: 'doc', text: 'After', count: 1 },
    { kind: 'expect-main', lacks: 'World' },
  ],
};

/**
 * The same round-trip when the suggested text ALREADY OCCURS in the document (`World` is in the
 * seeded heading): the review layer's applied-change matching is content-based, so overlapping text
 * is where a suggestion can be mistaken for an accepted edit, double, or swallow input.
 */
export const overlapRoundTripScenario: ReviewScenario = {
  name: 'round-trip with content overlapping the suggestion',
  setup: { content: '# Hello World\n' },
  steps: [
    { kind: 'type', text: 'Hello\n' },
    { kind: 'expect-count', where: 'main', text: 'Hello', count: 2 },
    { kind: 'select-mode', mode: 'suggesting' },
    { kind: 'type', text: 'World\n' },
    { kind: 'expect-own-change', contains: 'World' },
    { kind: 'expect-count', where: 'main', text: 'World', count: 1 },
    { kind: 'expect-count', where: 'doc', text: 'World', count: 2 },
    { kind: 'select-mode', mode: 'editing', viewMode: 'preview' },
    { kind: 'expect-clean-insert', text: 'World' },
    { kind: 'expect-count', where: 'doc', text: 'Hello', count: 2 },
    { kind: 'expect-count', where: 'main', text: 'World', count: 1 },
    { kind: 'type', text: 'After\n' },
    { kind: 'expect-main', contains: 'Hello\nAfter' },
    { kind: 'expect-count', where: 'main', text: 'World', count: 1 },
    { kind: 'select-mode', mode: 'suggesting' },
    { kind: 'expect-count', where: 'doc', text: 'World', count: 2 },
    { kind: 'expect-count', where: 'doc', text: 'Hello', count: 2 },
    { kind: 'expect-count', where: 'doc', text: 'After', count: 1 },
    { kind: 'select-mode', mode: 'editing', viewMode: 'preview' },
    { kind: 'expect-count', where: 'main', text: 'World', count: 1 },
    { kind: 'expect-count', where: 'main', text: 'Hello', count: 2 },
  ],
};

/**
 * Markup: wrapping MULTIPLE words in a delimiter pair diffs as two zero-width `**` inserts — the pair
 * must surface as one atomic suggestion (half an accepted pair is broken syntax). A single-word wrap
 * already diffs as one replace; the multi-word wrap is the split-pair case.
 */
export const boldWrapScenario: ReviewScenario = {
  name: 'a bold wrap suggests as one atomic change',
  setup: { content: 'alpha bravo charlie delta.\n' },
  steps: [
    { kind: 'select-mode', mode: 'suggesting' },
    { kind: 'type', at: 'bravo', text: '**' },
    { kind: 'type', at: ' delta', text: '**' },
    { kind: 'expect-own-branch', contains: '**bravo charlie**' },
    { kind: 'expect-main', lacks: '**' },
    { kind: 'select-mode', mode: 'editing', viewMode: 'preview' },
    { kind: 'expect-main', lacks: '**' },
    { kind: 'expect-one-suggestion', containing: '**bravo charlie**' },
  ],
};

/**
 * Complex markup: a whole suggested table is one clean block insertion, and editing a cell of an
 * existing table stays inside the cell — main's table is untouched until Accept.
 */
export const tableSuggestScenario: ReviewScenario = {
  name: 'a suggested table is a clean block insertion',
  setup: { content: '# Doc\n\nSome text.\n' },
  steps: [
    { kind: 'select-mode', mode: 'suggesting' },
    { kind: 'type', text: '\n| a | b |\n| --- | --- |\n| 1 | 2 |\n' },
    { kind: 'expect-own-branch', contains: '| a | b |' },
    { kind: 'expect-main', lacks: '|' },
    { kind: 'select-mode', mode: 'editing', viewMode: 'preview' },
    { kind: 'expect-main', lacks: '|' },
    { kind: 'expect-clean-insert', text: '| a | b |' },
    { kind: 'select-mode', mode: 'suggesting' },
    { kind: 'expect-count', where: 'doc', text: '| a | b |', count: 1 },
    { kind: 'expect-main', lacks: '|' },
  ],
};

export const tableCellEditScenario: ReviewScenario = {
  name: 'editing a table cell suggests only the cell',
  setup: { content: '| a | b |\n| --- | --- |\n| one | two |\n' },
  steps: [
    { kind: 'select-mode', mode: 'suggesting' },
    { kind: 'type', at: 'two', text: 'X' },
    { kind: 'expect-own-branch', contains: 'Xtwo' },
    { kind: 'expect-main', lacks: 'X' },
    { kind: 'select-mode', mode: 'editing', viewMode: 'preview' },
    { kind: 'expect-main', lacks: 'X' },
    { kind: 'expect-clean-insert', text: 'X' },
    { kind: 'expect-count', where: 'main', text: '| one | two |', count: 1 },
  ],
};

export const reviewScenarios: ReviewScenario[] = [
  editingScenario,
  suggestingScenario,
  suggestingDeleteScenario,
  modeRoundTripScenario,
  overlapRoundTripScenario,
  boldWrapScenario,
  tableSuggestScenario,
  tableCellEditScenario,
];
