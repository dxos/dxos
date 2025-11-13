//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { sendMessage } from 'webext-bridge/popup';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';
import { Input, Toolbar } from '@dxos/react-ui';

import { Container, Popup, type PopupProps } from './components';
import { HOME_URL, THUMBNAIL_PROP } from './defs';

const Root = () => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

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

  const handleAdd: PopupProps['onAdd'] = async () => {
    log.info('sending...');
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      log.error('no active tab found');
      return null;
    }

    try {
      const result = await sendMessage('ping', { debug: true }, { context: 'content-script', tabId: tab.id });
      log.info('result', { result });
      return result;
    } catch (err) {
      log.catch(err);
    }

    return null;
  };

  const handleSearch: PopupProps['onSearch'] = async (text) => {
    log.info('search', { text });
    return null;
  };

  const handleLaunch: PopupProps['onLaunch'] = async () => {
    window.open(HOME_URL);
  };

  return (
    <Container classNames='is-[300px] p-2'>
      {!thumbnailUrl && <Popup onAdd={handleAdd} onSearch={handleSearch} onLaunch={handleLaunch} />}
      {thumbnailUrl && (
        <div className='flex flex-col gap-2 is-full'>
          <Toolbar.Root>
            <Input.Root>
              <Input.TextInput disabled value={thumbnailUrl} />
            </Input.Root>
            <Toolbar.IconButton
              icon='ph--clipboard--regular'
              iconOnly
              label='Clipboard'
              onClick={async () => {
                if (thumbnailUrl) {
                  await navigator.clipboard.writeText(thumbnailUrl);
                }
              }}
            />
          </Toolbar.Root>
          <div className='flex justify-center'>
            <img src={thumbnailUrl} alt='Thumbnail' />
          </div>
        </div>
      )}
    </Container>
  );
};

const main = async () => {
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
