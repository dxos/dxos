//
// Copyright 2026 DXOS.org
//

/** Block-type hues of the CodeMirror extension (`packages/reflect/deus/src/extension/fences.ts`), Tailwind 400 (question 300). */
export const BLOCK_TYPE_COLORS = {
  ext: '#a78bfa',
  type: '#60a5fa',
  op: '#fb923c',
  feat: '#34d399',
  scenario: '#22d3ee',
  test: '#2dd4bf',
  component: '#f472b6',
  service: '#facc15',
  db: '#f87171',
  module: '#818cf8',
  suite: '#a3e635',
  decision: '#fbbf24',
  question: '#fdba74',
} as const;

/**
 * `editor.tokenColorCustomizations.textMateRules` giving each known block type its CodeMirror hue, and the two
 * actor kinds distinct colours, which most themes paint alike because both are `support.*`.
 */
export const mdlRules = () => [
  ...Object.entries(BLOCK_TYPE_COLORS).map(([type, foreground]) => ({
    scope: `keyword.control.block.${type}.mdl`,
    settings: { foreground, fontStyle: 'bold' },
  })),
  { scope: 'variable.other.property.mdl', settings: { foreground: '#60a5fa' } },
  { scope: ['support.class.actor.user.mdl', 'string.unquoted.actor.user.mdl'], settings: { foreground: '#34d399' } },
  {
    scope: ['support.function.actor.agent.mdl', 'string.unquoted.actor.agent.mdl'],
    settings: { foreground: '#c084fc' },
  },
];
