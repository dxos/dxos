//
// Copyright 2024 DXOS.org
//

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React, { type FC } from 'react';
import { useKey } from 'react-use';

import type { ButtonProps } from './Button';
import { Button } from './Button';
import { Icon } from './Icon/Icon';
import { Tooltip } from './Tooltip';
import { useRoomContext } from '../hooks/useRoomContext';
import { errorMessageMap } from '../hooks/useUserMedia';
import { metaKey } from '../utils/metaKey';

export const MicButton: FC<
  ButtonProps & {
    warnWhenSpeakingWhileMuted?: boolean;
  }
> = ({ onClick, warnWhenSpeakingWhileMuted, ...rest }) => {
  const {
    userMedia: { turnMicOn, turnMicOff, audioEnabled, audioUnavailableReason },
  } = useRoomContext();

  const toggle = () => {
    audioEnabled ? turnMicOff() : turnMicOn();
  };

  useKey((e) => {
    if (e.key === 'd' && e.metaKey) {
      e.preventDefault();
      return true;
    }
    return false;
  }, toggle);

  const audioUnavailableMessage = audioUnavailableReason ? (errorMessageMap as any)[audioUnavailableReason] : null;

  return (
    <>
      <Tooltip content={audioUnavailableMessage ?? `Turn mic ${audioEnabled ? 'off' : 'on'} (${metaKey}D)`}>
        <Button
          displayType={audioEnabled ? 'secondary' : 'danger'}
          disabled={!!audioUnavailableMessage}
          onClick={(e) => {
            toggle();
            onClick && onClick(e);
          }}
          {...rest}
        >
          <VisuallyHidden>{audioEnabled ? 'Turn mic off' : 'Turn mic on'}</VisuallyHidden>
          <Icon type={audioEnabled ? 'micOn' : 'micOff'} />
        </Button>
      </Tooltip>
    </>
  );
};
