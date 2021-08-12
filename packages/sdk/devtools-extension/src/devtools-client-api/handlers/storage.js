//
// Copyright 2020 DXOS.org
//

export default ({ hook, bridge }) => {
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
