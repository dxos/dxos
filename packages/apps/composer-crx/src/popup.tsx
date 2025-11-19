//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { sendMessage } from 'webext-bridge/popup';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { Chat, type ChatProps, Container, ErrorBoundary, Thumbnail } from './components';
import { THUMBNAIL_PROP, getConfig } from './config';

// NOTE: Keep in sync with popup.html initial layout.
const rootClasses = 'is-[500px]';

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
  const handlePing: ChatProps['onPing'] = async () => {
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
  };

  if (thumbnailUrl) {
    return (
      <Container classNames='is-[300px]'>
        <Thumbnail url={thumbnailUrl} />
      </Container>
    );
  }

  return (
    <ErrorBoundary>
      <Container classNames={rootClasses}>
        {host && <Chat host={host} url={tabUrl ?? undefined} onPing={handlePing} />}
      </Container>
    </ErrorBoundary>
  );
};

const main = async () => {
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
