//
// Copyright 2026 DXOS.org
//

/** When a typed number commits: as each value parses, or only on blur and Enter. */
export type CommitOn = 'change' | 'blur';

/** The field's text, and a typed value waiting for blur when the form commits on blur. */
export type NumberEditState = { text: string; pending?: number };

/** What happened: typing (a value, or NaN while it does not parse), a stepper press, a blur or Enter, or Escape. */
export type NumberEditEvent =
  | { kind: 'type'; text: string; value: number }
  | { kind: 'step'; text: string; value: number }
  | { kind: 'commit' }
  | { kind: 'revert' };

/** The next state, the value to commit, or the committed value to put back. */
export type NumberEditResult = { state: NumberEditState; commit?: number; restore?: number };

/**
 * A number field's edits: a stepper press commits at once; a typed value commits as it parses, or, when the form commits
 * on blur, on blur or Enter; Escape puts the committed value back.
 */
export const numberEdit = (
  state: NumberEditState,
  event: NumberEditEvent,
  { commitOn, committed }: { commitOn: CommitOn; committed: number | undefined },
): NumberEditResult => {
  switch (event.kind) {
    case 'step':
      return Number.isNaN(event.value)
        ? { state: { text: event.text } }
        : { state: { text: event.text }, commit: event.value };
    case 'type':
      if (Number.isNaN(event.value)) {
        return { state: { text: event.text } };
      }
      return commitOn === 'change'
        ? { state: { text: event.text }, commit: event.value }
        : { state: { text: event.text, pending: event.value } };
    case 'commit':
      return state.pending === undefined ? { state } : { state: { text: state.text }, commit: state.pending };
    case 'revert':
      return committed === undefined
        ? { state: { text: '' } }
        : { state: { text: String(committed) }, restore: committed };
  }
};
