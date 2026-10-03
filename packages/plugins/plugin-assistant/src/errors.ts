//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** `runPromptInChat` was given neither a chat nor an object whose companion chat should run it. */
export class ChatNotSpecifiedError extends BaseError.extend('ChatNotSpecifiedError', 'Pass `chat` or `companionTo`.') {}
