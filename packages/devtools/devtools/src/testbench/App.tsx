//
// Copyright 2022 DXOS.org
//

import React from 'react';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import devtoolsURL from './devtools/index.html?url';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import kaiURL from './kai/index.html?url';

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
    const iframe = document.getElementById('kai') as HTMLIFrameElement;
    if (!iframe) {
      throw new Error('Kai iframe not found.');
    }
    iframe.contentWindow?.postMessage(event.data, '*');
  }
});

/**
 * Main app container with routes.
 */
export const App = () => {
  return (
    <div className='h-screen w-full grid grid-rows-2 grid-flow-col gap-4'>
      <div>
        <iframe id='kai' src={kaiURL} className='w-full h-full' />
      </div>
      <div>
        <iframe id='devtools' src={devtoolsURL} className='w-full h-full' />
      </div>
    </div>
  );
};
