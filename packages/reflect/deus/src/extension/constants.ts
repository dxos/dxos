//
// Copyright 2025 DXOS.org
//

/**
 * Known Spec block types from the core + standard dialect.
 * In future this will be derived from the Extensions table in the document.
 */
export const BLOCK_TYPES = [
  'ext',
  'type',
  'op',
  'feat',
  'feature',
  'scenario',
  'test',
  'component',
  'service',
  'db',
  'module',
  'suite',
  'decision',
  'verdict',
  'question',
  'plugin',
  'uses',
  'table',
] as const;

/** The statuses of a `question` block (`lang/question.mdl`), in the order a viewer lists them. */
export const QUESTION_STATUSES = ['open', 'answered', 'moot'] as const;

export type QuestionStatus = (typeof QUESTION_STATUSES)[number];
