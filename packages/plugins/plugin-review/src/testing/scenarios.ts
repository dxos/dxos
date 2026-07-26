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
   */
  | { kind: 'expect-clean-insert'; text: string }
  /** The user's own tracked change: contains a substring, or (`none`) no own change/branch exists. */
  | { kind: 'expect-own-change'; contains?: string; none?: boolean };

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

export const reviewScenarios: ReviewScenario[] = [
  editingScenario,
  suggestingScenario,
  suggestingDeleteScenario,
  modeRoundTripScenario,
  overlapRoundTripScenario,
];
