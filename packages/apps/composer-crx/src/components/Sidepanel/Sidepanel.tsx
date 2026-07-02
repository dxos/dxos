//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { sendMessage } from 'webext-bridge/popup';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';
import { ErrorBoundary, IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { focusOrOpenComposerTab } from '../../bridge';
import { THUMBNAIL_PROP, getConfig } from '../../config';
import { translationKey } from '../../translations';
import { Chat } from '../Chat';
import { PageActions } from '../PageActions';
import { Root } from '../Root';
import { Thumbnail } from '../Thumbnail';

/**
 * Side panel root component.
 */
export const Sidepanel = () => {
  const { t } = useTranslation(translationKey);
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

  const handleLaunchComposer = useCallback(() => {
    void focusOrOpenComposerTab();
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

  const pageActions = tabId !== undefined && tabUrl ? <PageActions tabId={tabId} tabUrl={tabUrl} /> : null;
  const showChat = !thumbnailUrl && !!host;

  return (
    <Root name='sidepanel'>
      <Panel.Root classNames='absolute inset-0 dx-container'>
        {/* App controls that are not chat-specific (clip, page actions, launch) live here, not inside Chat. */}
        <Panel.Toolbar>
          <Toolbar.Root>
            <IconButton
              variant='ghost'
              icon='ph--paperclip--regular'
              iconOnly
              label={t('clip.button')}
              disabled={tabId === undefined}
              onClick={handleClip}
            />
            {pageActions}
            <Toolbar.Separator />
            <IconButton
              variant='ghost'
              icon='ph--arrow-square-out--regular'
              iconOnly
              label={t('launch-composer.button')}
              onClick={handleLaunchComposer}
            />
          </Toolbar.Root>
        </Panel.Toolbar>

        <Panel.Content
          classNames={mx('grid grid-rows-[minmax(0,1fr)] min-h-0', thumbnailUrl && 'grid-cols-[auto_1fr]')}
        >
          {thumbnailUrl && <Thumbnail url={thumbnailUrl} />}
          {showChat && (
            <ErrorBoundary
              name='sidepanel/chat'
              fallbackRender={() => (
                <div className='grid place-items-center p-4 text-sm text-description'>{t('chat.error.label')}</div>
              )}
            >
              <Chat host={host} url={tabUrl ?? undefined} />
            </ErrorBoundary>
          )}
        </Panel.Content>

        <Panel.Statusbar classNames='flex items-center px-2'>
          <span className='text-xs text-description truncate'>{tabUrl}</span>
        </Panel.Statusbar>
      </Panel.Root>
    </Root>
  );
};

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
