//
// Copyright 2026 DXOS.org
//

export const styles = {
  /**
   * Vertical rhythm for block widgets. Padding, never margin: CodeMirror measures a widget from its own
   * box, so a margin sits outside what it can see and its height model drifts from what is rendered —
   * the error accumulates down the document until the turn-fold gutter markers are visibly misaligned.
   * Note padding does not collapse between adjacent siblings the way margins do
   */
  padding: 'pt-2 pb-4',
  border: 'border border-subdued-separator rounded-sm',
};
