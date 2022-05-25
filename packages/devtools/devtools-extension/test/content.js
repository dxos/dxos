//
// Copyright 2022 DXOS.org
//

// const port = chrome.runtime.connect({ name: 'knockknock' });

// console.log('CONTENT connect', { port });

// chrome.runtime.sendMessage({ joke: 'Knock knock' });
  
chrome.runtime.onMessage.addListener(function (msg) {
  console.log('CONTENT onMessage', { msg });

  if (msg.question === "Who's there?") {
    port.postMessage({ answer: 'Madame' });
  } else if (msg.question === 'Madame who?') {
    port.postMessage({ answer: 'Madame... Bovary' });
  }
});
