//
// Copyright 2020 DXOS.org
//

import { css } from '@emotion/css';
import React from 'react';
import { createRoot } from 'react-dom/client';

if ('serviceWorker' in navigator) {
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register
  // Must be served from https and have start_url.
  // Register a service worker hosted at the root of the site using the default scope.
  navigator.serviceWorker.register('./sw.js').then((registration) => {
    console.log('Service worker registration succeeded:', registration);
  }, (error) => {
    console.error(`Service worker registration failed: ${error}`);
  });
} else {
  console.error('Service workers are not supported.');
}

const styles = css`
  display: flex;
  flex-direction: row;
  flex: 1;
  align-items: center;
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  > div {
    display: flex;
    flex-direction: column;
    flex: 1;
    align-items: center;
  }
`;

const App = () => {
  return (
    <div className={styles}>
      <div>
        <div>
           <img src='./icons/icon-256.png' alt='logo' />
        </div>
      </div>
    </div>
  );
};

const main = () => {
  const root = createRoot(document.getElementById('root')!);
  root.render(<App />);
};

main();
