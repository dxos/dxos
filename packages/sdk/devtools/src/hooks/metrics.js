//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { useBridge } from './bridge';

export const useMetrics = () => {
  const [bridge] = useBridge();
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    let metricListenerKey;

    bridge.listen('metrics.data', ({ data }) => {
      setMetrics(data);
    });

    (async () => {
      metricListenerKey = await bridge.send('metrics.subscribe');
    })();

    return () => {
      if (metricListenerKey) {
        bridge.send('metrics.unsubscribe', { key: metricListenerKey });
      }
    };
  }, [bridge]);

  return metrics;
};
