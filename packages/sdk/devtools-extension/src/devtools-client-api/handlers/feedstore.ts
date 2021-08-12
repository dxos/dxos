//
// Copyright 2020 DXOS.org
//

import { HandlerProps } from "./handler-props";

export default ({ hook, bridge }: HandlerProps) => {
  bridge.onMessage('feedstore.descriptors', () => {
    try {
      return hook.feedStore
        .getDescriptors()
        .map(({ feed, path, opened, metadata }) => ({ path, opened, metadata, blocks: feed.length }));
    } catch (e) {
      console.error('DXOS DevTools: feedstore handler failed to respond');
      console.log(e);
    }
  });
};
