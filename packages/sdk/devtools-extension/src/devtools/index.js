//
// Copyright 2020 DXOS.org
//

/* global chrome */

let panelCreated = false;
let checkCount = 0;

function createPanel () {
  // stop trying if above 120 seconds or already made
  if (panelCreated || checkCount++ > 120) {
    return;
  }

  // Other dev tools may not have easy access to client, so they can set display flag to true manually.
  chrome.devtools.inspectedWindow.eval(
    '!!(window.__DXOS__);',
    (result, isException) => {
      // TODO(elmasse) How should we better handle this error?
      if (isException) {
        console.log('DXOS devtools', isException);
      }

      // already created or no client
      if (!result || panelCreated) {
        return;
      }

      // clear watcher
      if (loadCheckInterval) {
        clearInterval(loadCheckInterval);
      }
      panelCreated = true;

      chrome.devtools.panels.create(
        'DXOS',
        null,
        'main-panel.html'
      );
    }
  );
}

// Attempt to create panel on navigations as well
chrome.devtools.network.onNavigated.addListener(createPanel);

// Attempt to create panel once per second in case
// DXOS is loaded after page load
const loadCheckInterval = setInterval(createPanel, 1000);

// Start the first attempt immediately
createPanel();
