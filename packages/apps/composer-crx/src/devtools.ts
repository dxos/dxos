//
// Copyright 2026 DXOS.org
//

/**
 * Devtools-page entrypoint. Registers the Composer panel with Chrome's
 * devtools UI. Runs once per devtools window opened against a tab.
 */
chrome.devtools.panels.create('Composer', 'assets/img/icon-48.png', 'panel.html');
