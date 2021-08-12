//
// Copyright 2020 DXOS.org
//

// Note that we can not simply import the debug module here and call its enable, disable
// functions -- if we did that we'd be calling a different instance of the createDebug
// object, with the result that we wouldn't change the log output from the application.

export default ({ hook, bridge }) => {
  bridge.onMessage('debug-logging.enable', ({ data }) => {
    try {
      hook.debug.enable(data);
    } catch (ex) {
      console.error('DevTools: Failed to enable logging');
      console.error(ex);
    }
  });
  bridge.onMessage('debug-logging.disable', () => {
    try {
      return hook.debug.disable();
    } catch (ex) {
      console.error('DevTools: Failed to disable logging');
      console.error(ex);
    }
  });
};
