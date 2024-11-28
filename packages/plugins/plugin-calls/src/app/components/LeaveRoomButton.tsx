//
// Copyright 2024 DXOS.org
//

import { PhoneX } from '@phosphor-icons/react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@dxos/react-ui';

export const LeaveRoomButton = () => {
  const navigate = useNavigate();
  return (
    <Button
      variant='destructive'
      onClick={() => {
        navigate('/');
      }}
    >
      <VisuallyHidden>Leave</VisuallyHidden>
      <PhoneX />
    </Button>
  );
};
