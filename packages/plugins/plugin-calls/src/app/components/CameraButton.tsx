//
// Copyright 2024 DXOS.org
//

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React, { type FC } from 'react';
import { useKey } from 'react-use';

import type { ButtonProps } from './Button';
import { Button } from './Button';
import { Icon } from './Icon/Icon';
import { useRoomContext } from '../hooks/useRoomContext';

export const CameraButton: FC<ButtonProps> = ({ onClick, ...rest }) => {
  const {
    userMedia: { turnCameraOff, turnCameraOn, videoEnabled },
  } = useRoomContext();

  const toggle = () => {
    videoEnabled ? turnCameraOff() : turnCameraOn();
  };

  useKey((e) => {
    if (e.key === 'e' && e.metaKey) {
      e.preventDefault();
      return true;
    }
    return false;
  }, toggle);

  return (
    <Button
      displayType={videoEnabled ? 'secondary' : 'danger'}
      onClick={(e) => {
        toggle();
        onClick && onClick(e);
      }}
      {...rest}
    >
      <VisuallyHidden>{videoEnabled ? 'Turn camera off' : 'Turn camera on'}</VisuallyHidden>
      <Icon type={videoEnabled ? 'videoOn' : 'videoOff'} />
    </Button>
  );
};
