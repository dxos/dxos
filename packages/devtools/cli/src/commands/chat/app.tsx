//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';
import type * as Registry from 'effect/reactivity/AtomRegistry';
import { type Accessor } from 'solid-js';

import { type AiSession } from '@dxos/assistant';

import { App, render } from '../../components/index.ts';
import { theme } from '../../theme.ts';
import { type LogBuffer } from '../../util/index.ts';
import { Chat, type ChatProps } from './components/index.ts';

export type ChatAppOptions = Omit<ChatProps, 'conversation'> & {
  conversation: Accessor<AiSession.Session | undefined>;
  debug: boolean;
  logBuffer: LogBuffer;
  registry: Registry.AtomRegistry;
};

/** Renders the chat TUI until the user exits. */
export const renderChatApp = ({
  conversation,
  debug,
  logBuffer,
  registry,
  ...chat
}: ChatAppOptions): Effect.Effect<void> =>
  render({
    app: () => (
      <App debug={debug} focusElements={['input', 'messages']} logBuffer={logBuffer} registry={registry} theme={theme}>
        {conversation() && <Chat {...chat} conversation={conversation()!} />}
      </App>
    ),
    focusElements: ['input', 'messages'],
    logBuffer,
    debug,
    theme,
  });
