//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { Button } from './Button';
import { Icon } from './Icon/Icon';
import { Tooltip } from './Tooltip';

interface RaiseHandButtonProps {
  raisedHand: boolean;
  onClick: () => void;
}

export const RaiseHandButton: FC<RaiseHandButtonProps> = ({ raisedHand, onClick }) => (
  <Tooltip content={raisedHand ? 'Lower hand' : 'Raise Hand'}>
    <Button
      displayType={raisedHand ? 'primary' : 'secondary'}
      onClick={(_e) => {
        onClick && onClick();
      }}
    >
      <Icon type='handRaised' />
    </Button>
  </Tooltip>
);
