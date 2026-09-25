//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** A range anchor was requested on a subject that is not a markdown document. */
export class RangeAnchorSubjectError extends BaseError.extend(
  'RangeAnchorSubjectError',
  'A range anchor needs a markdown document as the subject.',
) {}

/** The requested comment range is not a pair of ordered integer offsets inside the document. */
export class InvalidCommentRangeError extends BaseError.extend(
  'InvalidCommentRangeError',
  'The comment range must be ordered integer offsets within the document.',
) {}

/** Submitting the thread's first message left no persisted relation to report. */
export class CommentNotPersistedError extends BaseError.extend(
  'CommentNotPersistedError',
  'The comment thread was not persisted.',
) {}
