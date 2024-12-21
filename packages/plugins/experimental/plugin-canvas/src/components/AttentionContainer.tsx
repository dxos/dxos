//
// Copyright 2024 DXOS.org
//

import React, { type HTMLAttributes, type PropsWithChildren, useEffect } from 'react';
import { HotkeysProvider, useHotkeysContext } from 'react-hotkeys-hook';

import { type ThemedClassName } from '@dxos/react-ui';
import { useAttendableAttributes, useAttention } from '@dxos/react-ui-attention';
import { mx } from '@dxos/react-ui-theme';

export const GLOBAL_SCOPE = 'global';

/**
 * Wraps attention component handling the keyboard scope.
 * NOTE: Works with [hotkeys-js](https://www.npmjs.com/package/hotkeys-js) for headless processing.
 */
// TODO(burdon): Handle focus attention border.
// TODO(burdon): Factor out and replace @dxos/keyboard.
export const AttentionContainer = ({
  id,
  children,
  classNames,
  ...props
}: ThemedClassName<PropsWithChildren<{ id: string } & Pick<HTMLAttributes<HTMLDivElement>, 'tabIndex'>>>) => {
  const attendableAttrs = useAttendableAttributes(id);

  return (
    <div role='none' {...attendableAttrs} {...props} className={mx(classNames)}>
      <HotkeysProvider initiallyActiveScopes={[GLOBAL_SCOPE]}>
        <Inner id={id}>{children}</Inner>
      </HotkeysProvider>
    </div>
  );
};

const Inner = ({ id, children }: PropsWithChildren<{ id: string }>) => {
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
