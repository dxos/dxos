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

/** An agent turn was asked of a read-only host, which runs none. */
export class ReadOnlyHostError extends BaseError.extend('ReadOnlyHostError', 'A read-only host runs no agent turns.') {}
