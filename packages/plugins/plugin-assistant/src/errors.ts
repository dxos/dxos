//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** `runPromptInChat` was given neither a chat nor an object whose companion chat should run it. */
export class ChatNotSpecifiedError extends BaseError.extend('ChatNotSpecifiedError', 'Pass `chat` or `companionTo`.') {}

/** A comment-thread agent turn was asked for on a thread that is not yet saved. */
export class CommentThreadNotPersistedError extends BaseError.extend(
  'CommentThreadNotPersistedError',
  'The comment thread is not in a database.',
) {}
