//
// Copyright 2020 DXOS.org
//

export default ({ hook, bridge }) => {
  bridge.onMessage('config', () => {
    try {
      return {
        config: JSON.parse(JSON.stringify(hook.client.config)), // make sure the config is serializable
        profile: {
          username: hook.client.getProfile()?.username,
          publicKey: hook.client.getProfile()?.publicKey.toHex()
        }
      };
    } catch (e) {
      console.error('DXOS DevTools: Config handler failed to respond');
      console.log(e);
    }
  });
};
