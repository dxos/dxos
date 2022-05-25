//
// Copyright 2022 DXOS.org
//

const port = chrome.runtime.connect({ name: 'devtools' });

console.log('DEVTOOLS connect', { port });

port.postMessage({ name: 'init', tabId: chrome.devtools.inspectedWindow.tabId });

chrome.devtools.inspectedWindow.eval("chrome.runtime.sendMessage({ joke: 'Knock knock' });");

port.onMessage.addListener(function (msg) {
  console.log('DEVTOOLS port onMessage', { msg });

  if (msg.joke === 'Knock knock') {
    port.postMessage({ question: "Who's there?" });
  } else if (msg.answer === 'Madame') {
    port.postMessage({ question: 'Madame who?' });
  } else if (msg.answer === 'Madame... Bovary') {
    port.postMessage({ question: "I don't get it." });
  }
});
