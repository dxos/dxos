//
// Copyright 2020 DXOS.org
//

import { HandlerProps } from "./handler-props";

export default ({ hook, bridge }: HandlerProps) => {
  bridge.onMessage('config', () => {
    try {
      return {
        config: JSON.parse(JSON.stringify(hook.client.config)), // make sure the config is serializable
        profile: {
          username: hook.client.halo.getProfile()?.username,
          publicKey: hook.client.halo.getProfile()?.publicKey.toHex()
        }
      };
    } catch (e) {
      console.error('DXOS DevTools: Config handler failed to respond');
      console.log(e);
    }
  });
};
