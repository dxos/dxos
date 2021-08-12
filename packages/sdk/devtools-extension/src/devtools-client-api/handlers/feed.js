//
// Copyright 2020 DXOS.org
//

const feedListeners = new Map();

export default ({ hook, bridge }) => {
  bridge.onMessage('feed.subscribe', async ({ sender, data: { topic } }) => {
    try {
      const feedMessages = [];

      const feedDescriptors = hook.feedStore.getDescriptors().filter(d => d.metadata.partyKey.toString('hex') === topic);
      feedDescriptors.forEach(feedDescriptor => {
        const stream = feedDescriptor.feed.createReadStream({ live: true });
        stream.on('data', (data) => {
          feedMessages.push({ data });
          bridge.sendMessage('feed.data', feedMessages, sender.name);
        });
      });

      const listenerKey = Date.now();

      return listenerKey;
    } catch (e) {
      console.error('DXOS DevTools: feed handler failed to respond');
      console.log(e);
    }
  });

  bridge.onMessage('feed.unsubscribe', async ({ data: { key } }) => {
    const removeListener = feedListeners.get(key);
    if (removeListener) {
      removeListener();
    }
  });
};
