//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { sendMessage } from 'webext-bridge/popup';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';
import { ErrorBoundary } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { Chat, type ChatProps, Container, Thumbnail } from './components';
import { THUMBNAIL_PROP, getConfig } from './config';

// NOTE: Keep in sync with popup.html initial layout.
const rootClasses = 'flex flex-col w-[500px] opacity-0 [animation:popup-fade-in_0.5s_ease-out_forwards]';

/**
 * Root component.
 */
const Root = () => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [tabUrl, setTabUrl] = useState<string | null>(null);

  // Load config.
  const [host, setHost] = useState<string | null>(null);
  useEffect(() => {
    void (async () => {
      const config = await getConfig();
      setHost(config.chatAgentUrl);
    })();
  }, []);

  // Load current tab URL.
  useEffect(() => {
    void (async () => {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        setTabUrl(tab.url.replace(/\/$/, ''));
      }
    })();
  }, []);

  // Load thumbnail URL from storage when popup opens then clear it.
  useEffect(() => {
    void (async () => {
      const result = await browser.storage.local.get(THUMBNAIL_PROP);
      const thumbnailUrl = result?.[THUMBNAIL_PROP] as string;
      if (thumbnailUrl) {
        setThumbnailUrl(thumbnailUrl);
        await browser.storage.local.remove(THUMBNAIL_PROP);
      }
    })();
  }, []);

  // TODO(burdon): Change to event.
  // TODO(burdon): Demo to communicate with content script.
  const handlePing = useCallback<NonNullable<ChatProps['onPing']>>(async () => {
    log.info('sending...');
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      log.error('no active tab found');
      return null;
    }

    try {
      const result = await sendMessage(
        'ping',
        {
          debug: true,
        },
        {
          context: 'content-script',
          tabId: tab.id,
        },
      );

      log.info('result', { result });
      return result;
    } catch (err) {
      log.catch(err);
    }

    return null;
  }, []);

  const handleClip = useCallback(async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      return;
    }

    // Fire and forget — picker + delivery is orchestrated by the content
    // script and background worker. The popup closes naturally; any
    // rejection during the round-trip is surfaced by the background via a
    // browser notification, so here we just need to log it.
    sendMessage('start-picker', {}, { context: 'content-script', tabId: tab.id }).catch((err) => log.catch(err));
    window.close();
  }, []);

  return (
    <ErrorBoundary name='popup'>
      <Container classNames={mx(rootClasses)}>
        {thumbnailUrl && <Thumbnail url={thumbnailUrl} />}
        {!thumbnailUrl && host && (
          // Chat lives behind its own ErrorBoundary: the chat-agent endpoint
          // can be unreachable (e.g., dev worker not running) and a fetch
          // failure inside useAgentChat would otherwise take down the whole
          // popup — including the Clip flow, which is independent of chat.
          <ErrorBoundary name='popup/chat' fallbackRender={() => null}>
            <Chat host={host} url={tabUrl ?? undefined} onPing={handlePing} onClip={handleClip} />
          </ErrorBoundary>
        )}
      </Container>
    </ErrorBoundary>
  );
};

const main = async () => {
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
