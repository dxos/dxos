//
// Copyright 2020 DXOS.org
//

import metrics from '@dxos/metrics';

const metricslisteners = new Map();

export default ({ bridge }) => {
  const onMetrics = senderName => () => {
    const data = {
      values: metrics.values,
      events: metrics.events
    };
    bridge.sendMessage('metrics.data', data, senderName);
  };

  bridge.onMessage('metrics.subscribe', ({ sender }) => {
    try {
      const metricsHandler = onMetrics(sender.name);
      const handlerOff = metrics.on(null, metricsHandler);

      // Send first grab of metrics right away.
      metricsHandler();

      const listenerKey = Date.now();
      metricslisteners.set(listenerKey, () => {
        handlerOff();
      });

      return listenerKey;
    } catch (e) {
      console.error('DXOS DevTools: metrics handler failed to respond');
      console.log(e);
    }
  });

  bridge.onMessage('metrics.unsubscribe', async ({ data: { key } }) => {
    const removeListener = metricslisteners.get(key);
    if (removeListener) {
      removeListener();
    }
  });
};
