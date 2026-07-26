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
  /** Type text at the position of `at` (an anchor substring in the current editor document). */
  | { kind: 'type'; at: string; text: string }
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
  /** The user's own tracked-change decorations contain a substring. */
  | { kind: 'expect-own-change'; contains: string };

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
    { kind: 'expect-own-change', contains: '' },
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

export const reviewScenarios: ReviewScenario[] = [editingScenario, suggestingScenario, suggestingDeleteScenario];
