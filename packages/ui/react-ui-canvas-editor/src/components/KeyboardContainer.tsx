//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, useEffect } from 'react';
import { HotkeysProvider, useHotkeysContext } from 'react-hotkeys-hook';

import { useAttention } from '@dxos/react-ui-attention';

export const GLOBAL_SCOPE = 'global';

/**
 * Wraps the keyboard scope.
 * NOTE: Works with [hotkeys-js](https://www.npmjs.com/package/hotkeys-js) for headless processing.
 */
// TODO(burdon): Factor out and replace @dxos/keyboard.
export const KeyboardContainer = ({ id, children }: PropsWithChildren<{ id: string }>) => (
  <HotkeysProvider initiallyActiveScopes={[GLOBAL_SCOPE]}>
    <KeyboardContainerImpl id={id}>{children}</KeyboardContainerImpl>
  </HotkeysProvider>
);

const KeyboardContainerImpl = ({ id, children }: PropsWithChildren<{ id: string }>) => {
  const { hasAttention } = useAttention(id);
  const { enableScope, disableScope } = useHotkeysContext();
  useEffect(() => {
    if (hasAttention) {
      enableScope(id);
    } else {
      disableScope(id);
    }
  }, [id, hasAttention]);

  return <>{children}</>;
};
