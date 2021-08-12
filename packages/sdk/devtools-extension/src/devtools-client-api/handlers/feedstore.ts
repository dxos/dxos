//
// Copyright 2020 DXOS.org
//

import { HandlerProps } from "./handler-props";

export default ({ hook, bridge }: HandlerProps) => {
  bridge.onMessage('feedstore.descriptors', () => {
    try {
      return hook.feedStore
        .getDescriptors()
        .map(({ feed, opened, metadata, key }) => ({ key: key.toHex(), opened, metadata, blocks: feed?.length ?? 0 }));
    } catch (e) {
      console.error('DXOS DevTools: feedstore handler failed to respond');
      console.log(e);
    }
  });
};
