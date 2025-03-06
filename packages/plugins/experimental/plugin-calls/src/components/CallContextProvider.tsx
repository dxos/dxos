//
// Copyright 2024 DXOS.org
//

import { useEffect, type FC, type PropsWithChildren } from 'react';

import { useIsSpeaking, useCallGlobalContext } from '../hooks';

/**
 * Global context provider for calls.
 */
export const CallContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const { call } = useCallGlobalContext();

  // TODO(mykola): Move to global context.
  const isSpeaking = useIsSpeaking(call.media.audioTrack);
  useEffect(() => {
    if (call.joined) {
      call.setSpeaking(isSpeaking);
    }
  }, [isSpeaking, call.joined]);

  return children;
};
