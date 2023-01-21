//
// Copyright 2022 DXOS.org
//

import React from 'react';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import devtoolsURL from './devtools/index.html?url';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import testAppUrl from './testing/index.html?url';

// Pass messages between devtools and kai IFrames.
window.addEventListener('message', (event) => {
  if (event.data.source === 'dxos-client') {
    const iframe = document.getElementById('devtools') as HTMLIFrameElement;
    if (!iframe) {
      throw new Error('Devtools iframe not found.');
    }
    iframe.contentWindow?.postMessage(event.data, '*');
  }

  if (event.data.source === 'content-script') {
    const iframe = document.getElementById('testing') as HTMLIFrameElement;
    if (!iframe) {
      throw new Error('Test app iframe not found.');
    }
    iframe.contentWindow?.postMessage(event.data, '*');
  }
});

/**
 * Main container with test app and devtools.
 */
export const App = () => {
  return (
    <div className='absolute left-0 right-0 top-0 bottom-0 flex flex-col'>
      <div className='flex flex-1'>
        <iframe id='testing' src={testAppUrl} className='w-full h-full' />
      </div>
      <div className='flex flex-1 border-t-2 border-gray-500'>
        <iframe id='devtools' src={devtoolsURL} className='w-full h-full' />
      </div>
    </div>
  );
};
