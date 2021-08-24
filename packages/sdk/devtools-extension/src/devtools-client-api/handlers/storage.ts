//
// Copyright 2020 DXOS.org
//

import { HandlerProps } from './handler-props';

export default ({ hook, bridge }: HandlerProps) => {
  bridge.onMessage('storage.reset', async () => {
    try {
      await hook.client.reset();
      window.location.reload();
    } catch (e) {
      console.error('DXOS DevTools: reset handler failed to respond');
      console.log(e);
    }
  });
};
