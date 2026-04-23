//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';
import { sendMessage } from 'webext-bridge/popup';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';
import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

/**
 * Popup control for starting the clipping flow.
 *
 * The popup closes as soon as the user mouses onto the page, so this button
 * fires a one-way message to the content script and closes. Success / error
 * feedback surfaces in the Composer tab (via `plugin-crx-bridge` toasts) and
 * through browser notifications from the background worker when no Composer
 * tab is open.
 */
export const ClipAction = () => {
  const onClip = useCallback(async () => {
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
    <div className='flex flex-col gap-2 p-3'>
      <button
        type='button'
        onClick={onClip}
        className={mx(
          'flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
          'bg-blue-600 text-white hover:bg-blue-500',
        )}
      >
        <Icon icon='ph--paperclip--regular' size={4} />
        Clip to Composer
      </button>
      <p className='text-xs opacity-70'>Pick an element on the page. Use ↑/↓ to widen the selection, Esc to cancel.</p>
    </div>
  );
};
