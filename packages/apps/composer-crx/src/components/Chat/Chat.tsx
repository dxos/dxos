//
// Copyright 2024 DXOS.org
//

import { type UIMessage } from '@ai-sdk/react';
import { useAgentChat } from 'agents/ai-react';
import { useAgent } from 'agents/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import browser from 'webextension-polyfill';

import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { ChatEditor, type ChatEditorController, type ChatEditorProps } from '@dxos/react-ui-chat';
import { MarkdownStream, type MarkdownStreamController, type MarkdownStreamProps } from '@dxos/react-ui-markdown';
import { compactSlots } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { SPACE_ID_PROP, SPACE_MODE_PROP } from '../../config';
import { translationKey } from '../../translations';

// Minimal registry: only the block-level `prompt` tag (user turns render as bubbles). No widgets,
// so none of plugin-assistant's app-framework-coupled renderers are pulled in.
const registry: MarkdownStreamProps['registry'] = {
  prompt: { block: true },
};

const streamOptions: MarkdownStreamProps['options'] = {
  autoScroll: true,
  typewriter: true,
  cursor: false,
  fader: false,
};

type Metadata = {
  hidden?: boolean;
};

// Hidden context injected as an assistant turn so the agent has it, but never shown to the user.
const HIDDEN_CONTEXT_PREFIX = '<system-context>';

/**
 * True for the injected system-context turn. `useAgentChat` does not reliably round-trip custom
 * `metadata`, so the content marker is the durable signal — without it the raw `<system-context>`
 * block leaks into the rendered thread.
 */
const isHiddenContext = (message: UIMessage<Metadata>): boolean =>
  message.metadata?.hidden === true ||
  message.parts.some((part) => part.type === 'text' && part.text.trimStart().startsWith(HIDDEN_CONTEXT_PREFIX));

export type ChatProps = ThemedClassName<{
  /** Chat-agent host (ws/wss); the agent connection is derived from it. */
  host?: string;
  /** URL of the page the panel is attached to; injected as chat context. */
  url?: string;
  /** Surfaces the chat-agent error so a host (the side panel) can show it in its status bar. */
  onError?: (error: Error | undefined) => void;
}>;

/**
 * Simplified chat: a streaming markdown thread over an editor input, backed by the chat agent.
 */
export const Chat = ({ classNames, host, url, onError }: ChatProps) => {
  const { t } = useTranslation(translationKey);
  const editorRef = useRef<ChatEditorController>(null);
  const spaceIdRef = useRef<SpaceId | null>(null);

  // Chat agent client.
  const agent = useAgent({
    agent: 'chat',
    protocol: isSecureUrl(host ?? '') ? 'wss' : 'ws',
    host,
  });

  // TODO(burdon): Define tools (see generic params).
  // TODO(burdon): Get initial messages (currently the history only appears after the first message).
  const { error, messages, sendMessage, stop, clearError, clearHistory } = useAgentChat<unknown, UIMessage<Metadata>>({
    agent,
    resume: true,
    // TODO(burdon): This will replace the initial message history.
    // getInitialMessages: async () => []
  });

  const filteredMessages = useMemo(
    () => messages.filter((message) => message.role !== 'system' && !isHiddenContext(message)),
    [messages],
  );

  // Lift the chat-agent error to the host (shown in the side panel's status bar).
  // Clear it on unmount so a stale error does not linger after Chat is hidden (e.g. a thumbnail).
  useEffect(() => {
    onError?.(error);
    return () => onError?.(undefined);
  }, [error, onError]);

  // Render the thread to a single markdown document (see `renderThread`) and sync it into the
  // stream. The AI streaming contract makes the rendered text grow monotonically, so a prefix
  // diff is enough: append the suffix while streaming, reset when the thread is cleared/replaced.
  const [controller, setController] = useState<MarkdownStreamController | null>(null);
  const renderedRef = useRef('');
  const content = useMemo(() => renderThread(filteredMessages), [filteredMessages]);
  useEffect(() => {
    if (!controller) {
      return;
    }

    const previous = renderedRef.current;
    if (content === previous) {
      return;
    }
    if (previous.length > 0 && content.startsWith(previous)) {
      void controller.append(content.slice(previous.length));
    } else {
      void controller.setContent(content);
      controller.scrollToBottom('instant');
    }
    renderedRef.current = content;
  }, [controller, content]);

  const currentUrl = useRef<string>(undefined);
  const handleSubmit = useCallback<NonNullable<ChatEditorProps['onSubmit']>>(
    (value) => {
      const text = value.trim();
      if (!text.length) {
        return;
      }

      // Fire-and-forget: `storage.sync.get` and `sendMessage` can reject, so route any failure to
      // the logger rather than leaving an unhandled rejection.
      (async () => {
        // Update context.
        // TODO(burdon): Get current selection?
        const context: string[] = [];

        // Update current url.
        if (currentUrl.current !== url || messages.length === 0) {
          currentUrl.current = url;
          context.push(
            "Determine if the user's question relates to the website the user is currently viewing.",
            `The current website is: ${url}`,
          );
        }

        // Determine space mode.
        const stored = await browser.storage.sync.get([SPACE_MODE_PROP, SPACE_ID_PROP]);
        const spaceMode = stored?.[SPACE_MODE_PROP];
        const spaceId = stored?.[SPACE_ID_PROP];
        if (spaceMode && spaceId) {
          if (SpaceId.isValid(spaceId) && (spaceId !== spaceIdRef.current || messages.length === 0)) {
            context.push(`Otherwise use the configured Space to retrieve information.`, `The Space ID is: ${spaceId}`);
            spaceIdRef.current = spaceId;
          }
        }

        // Send system message.
        if (context.length > 0) {
          log.info('system', { context });
          await sendMessage(
            {
              role: 'assistant',
              parts: [{ type: 'text', text: ['<system-context>', ...context, '</system-context>'].join('\n') }],
            },
            { metadata: { hidden: true } },
          );
        }

        // User message.
        await sendMessage({ role: 'user', parts: [{ type: 'text', text }] });
      })().catch((err) => log.catch(err));

      // Clear the editor.
      return true;
    },
    [sendMessage, url, messages.length],
  );

  const handleClear = useCallback(async () => {
    void stop();
    void clearError();
    void clearHistory();
    editorRef.current?.focus();
  }, [clearError, clearHistory, stop]);

  return (
    // Chat owns the content area: the thread fills and scrolls, the input is pinned to the bottom.
    <div className={mx('grid grid-rows-[1fr_auto] min-h-0 bg-base-surface', classNames)}>
      {/* `data-hue` gives the `<prompt>` bubbles their panel tokens (see MarkdownStream). */}
      <div data-hue='blue' className='contents'>
        <MarkdownStream
          ref={setController}
          classNames='min-h-0'
          debug={false}
          registry={registry}
          options={streamOptions}
          slots={compactSlots}
        />
      </div>

      <div className='flex flex-col'>
        <div className='flex relative items-center p-1'>
          <ChatEditor
            ref={editorRef}
            autoFocus
            lineWrapping
            classNames='w-full text-lg'
            placeholder={t('chat.placeholder')}
            onSubmit={handleSubmit}
          />
          {filteredMessages.length > 0 && (
            <div className='flex items-center absolute right-1.5 top-0 bottom-0 z-10'>
              <IconButton
                variant='ghost'
                icon='ph--x--regular'
                iconOnly
                label={t('chat.clear.button')}
                onClick={handleClear}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Neutralize `<prompt>`/`</prompt>` in user text so it cannot break out of the bubble wrapper
 * (a raw `</prompt>` would close the block early and let trailing text render as assistant markdown).
 */
const escapePromptText = (text: string): string => text.replace(/<(\/?)prompt>/g, '&lt;$1prompt>');

/**
 * Render the message thread to a single markdown document. User turns are wrapped in `<prompt>`
 * blocks (rendered as bubbles by MarkdownStream); assistant turns are plain markdown. The output
 * extends monotonically as the trailing message streams, which the syncer relies on.
 */
const renderThread = (messages: UIMessage<Metadata>[]): string =>
  messages
    .map((message) => {
      const text = message.parts
        .map((part) => (part.type === 'text' ? part.text : null))
        .filter(Boolean)
        .join('');
      return message.role === 'user' ? `\n<prompt>${escapePromptText(text)}</prompt>\n` : `${text}\n`;
    })
    .join('');

const isSecureUrl = (host: string) => {
  try {
    const url = new URL(host);
    return url.protocol === 'https:' || url.protocol === 'wss:';
  } catch {
    return false;
  }
};
