//
// Copyright 2020 DXOS.org
//

import { HandlerProps } from './handler-props';

export default ({ hook, bridge }: HandlerProps) => {
  bridge.onMessage('topics', () => {
    try {
      return Array.from(new Set(hook.feedStore
        .getDescriptors()
        .filter((descriptor: any) => descriptor.opened)
        .map(({ metadata }: any) => metadata.partyKey.toString('hex'))));
    } catch (e) {
      console.error('DXOS DevTools: topics handler failed to respond');
      console.log(e);
    }
  });
};
