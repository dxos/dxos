//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Button } from './Button';
import { Icon } from './Icon/Icon';
import { Tooltip } from './Tooltip';
import { cn } from '../utils/style';

export type ConnectionQuality = 'healthy' | 'tolerable' | 'unhealthy' | 'bad';

export const getConnectionQuality = (packetLoss: number): ConnectionQuality => {
  if (packetLoss > 0.05) {
    return 'bad';
  }
  if (packetLoss > 0.03) {
    return 'unhealthy';
  }
  if (packetLoss > 0.01) {
    return 'tolerable';
  }
  return 'healthy';
};

export const ConnectionIndicator = (props: { quality: ConnectionQuality }) => {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen} content={`Connection is ${props.quality}`}>
      <Button onClick={() => setOpen(!open)}>
        <Icon
          className={cn(
            props.quality === 'healthy' && 'text-green-400',
            props.quality === 'tolerable' && 'text-green-400',
            props.quality === 'unhealthy' && 'text-yellow-400',
            props.quality === 'bad' && 'text-red-400',
          )}
          type={props.quality === 'bad' || props.quality === 'unhealthy' ? 'SignalSlashIcon' : 'SignalIcon'}
        />
      </Button>
    </Tooltip>
  );
};
