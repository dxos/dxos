//
// Copyright 2024 DXOS.org
//

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React, { type FC } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from './Button';
import { Icon } from './Icon/Icon';

interface LeaveRoomButtonProps {
  meetingId?: string;
}

export const LeaveRoomButton: FC<LeaveRoomButtonProps> = ({ meetingId }) => {
  const navigate = useNavigate();
  return (
    <Button
      displayType='danger'
      onClick={() => {
        const params = new URLSearchParams();
        if (meetingId) {
          params.set('meetingId', meetingId);
        }
        navigate('/');
      }}
    >
      <VisuallyHidden>Leave</VisuallyHidden>
      <Icon type='phoneXMark' />
    </Button>
  );
};
