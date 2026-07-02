//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useCallback, useEffect, useState } from 'react';
import { type Root as ReactRoot, createRoot } from 'react-dom/client';
import { sendMessage } from 'webext-bridge/popup';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';
import { ErrorBoundary } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { Chat, type ChatProps, Container, PageActions, Thumbnail } from './components';
import { THUMBNAIL_PROP, getConfig } from './config';

// The side panel fills the width Chrome allots it (user-resizable).
const rootClasses = 'flex flex-col w-full';

/**
 * The active tab of the panel's window, resolved at call time. Callbacks read
 * it fresh rather than closing over `useActiveTab` state to avoid stale-closure
 * reads from their empty-dependency `useCallback`s.
 */
const getActiveTab = () => browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => tab);

/**
 * Tracks the active tab of the current window. Unlike the popup, the side panel
 * stays open across navigation and tab switches, so it must react to changes.
 */
const useActiveTab = (): { id?: number; url: string | null } => {
  const [tab, setTab] = useState<{ id?: number; url: string | null }>({ url: null });
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const active = await getActiveTab();
      if (cancelled) {
        return;
      }
      setTab({ id: active?.id, url: active?.url ? active.url.replace(/\/$/, '') : null });
    };

    void refresh();
    const onActivated = () => void refresh();
    const onUpdated = (_tabId: number, changeInfo: browser.Tabs.OnUpdatedChangeInfoType) => {
      // Only URL changes affect what the panel shows.
      if (changeInfo.url) {
        void refresh();
      }
    };
    browser.tabs.onActivated.addListener(onActivated);
    browser.tabs.onUpdated.addListener(onUpdated);
    return () => {
      cancelled = true;
      browser.tabs.onActivated.removeListener(onActivated);
      browser.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  return tab;
};

/**
 * Root component.
 */
const Root = () => {
  const { id: tabId, url: tabUrl } = useActiveTab();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // Load config.
  const [host, setHost] = useState<string | null>(null);
  useEffect(() => {
    void (async () => {
      const config = await getConfig();
      setHost(config.chatAgentUrl);
    })();
  }, []);

  // The thumbnail is produced by the context-menu action while the panel is
  // (re)opening, so consume it on mount and whenever it is written to storage.
  useEffect(() => {
    const consume = async () => {
      const result = await browser.storage.local.get(THUMBNAIL_PROP);
      const url = result?.[THUMBNAIL_PROP] as string | undefined;
      if (url) {
        setThumbnailUrl(url);
        await browser.storage.local.remove(THUMBNAIL_PROP);
      }
    };

    void consume();
    const onChanged = (changes: Record<string, browser.Storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[THUMBNAIL_PROP]?.newValue) {
        void consume();
      }
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  // TODO(burdon): Change to event.
  // TODO(burdon): Demo to communicate with content script.
  const handlePing = useCallback<NonNullable<ChatProps['onPing']>>(async () => {
    log.info('sending...');
    const tab = await getActiveTab();
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
    const tab = await getActiveTab();
    if (!tab?.id) {
      return;
    }

    // Fire and forget — picker + delivery is orchestrated by the content
    // script and background worker. Any rejection during the round-trip is
    // surfaced by the background via a browser notification, so here we just
    // need to log it. The panel stays open, unlike the former popup.
    sendMessage('start-picker', {}, { context: 'content-script', tabId: tab.id }).catch((err) => log.catch(err));
  }, []);

  // Embedded in the chat's toolbar so the chat input stays the first row of
  // the panel; rendered standalone whenever the chat is absent or crashed.
  const pageActions = tabId !== undefined && tabUrl ? <PageActions tabId={tabId} tabUrl={tabUrl} /> : null;
  const standaloneActions = pageActions && <div className='flex items-center p-1'>{pageActions}</div>;
  const showChat = !thumbnailUrl && !!host;

  return (
    <ErrorBoundary name='panel'>
      <Container classNames={mx(rootClasses)}>
        {thumbnailUrl && <Thumbnail url={thumbnailUrl} />}
        {showChat && (
          // Chat lives behind its own ErrorBoundary: the chat-agent endpoint
          // can be unreachable (e.g., dev worker not running) and a fetch
          // failure inside useAgentChat would otherwise take down the whole
          // panel — including the Clip and page-action flows, which are
          // independent of chat, so the fallback keeps the actions visible.
          <ErrorBoundary name='panel/chat' fallbackRender={() => standaloneActions}>
            <Chat host={host} url={tabUrl ?? undefined} onPing={handlePing} onClip={handleClip} actions={pageActions} />
          </ErrorBoundary>
        )}
        {!showChat && standaloneActions}
      </Container>
    </ErrorBoundary>
  );
};

declare global {
  // Survives dev-mode HMR re-execution of this entry module: React warns (and
  // detaches the old tree) if the same container is passed to createRoot twice.
  // eslint-disable-next-line no-var
  var __composerPanelRoot: ReactRoot | undefined;
}

const main = async () => {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Panel root element #root not found.');
  }
  globalThis.__composerPanelRoot ??= createRoot(container);
  globalThis.__composerPanelRoot.render(<Root />);
};

void main();
