//
// Copyright 2024 DXOS.org
//

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from './Button';
import { Icon } from './Icon/Icon';

export const LeaveRoomButton = () => {
  const navigate = useNavigate();
  return (
    <Button
      displayType='danger'
      onClick={() => {
        navigate('/');
      }}
    >
      <VisuallyHidden>Leave</VisuallyHidden>
      <Icon type='phoneXMark' />
    </Button>
  );
};
