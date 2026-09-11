//
// Copyright 2026 DXOS.org
//

import * as Chat from '@dxos/assistant/Chat';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

/** Where dictation is offered: anything with a text surface to dictate into. */
export const DICTATABLE_TYPES = [Markdown.Document, Chat.Chat];
