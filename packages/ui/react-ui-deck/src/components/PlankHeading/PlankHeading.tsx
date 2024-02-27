//
// Copyright 2024 DXOS.org
//

import React, { forwardRef } from 'react';

import { Button, type ButtonProps } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { type AttentionScopedProps, useHasAttention } from '../Attention';

type PlankHeadingButtonProps = Omit<ButtonProps, 'variant'> & { attendableId: string };

const plankHeadingIconProps = {
  className: getSize(5),
  weight: 'duotone',
};

const PlankHeadingButton = forwardRef<HTMLButtonElement, AttentionScopedProps<PlankHeadingButtonProps>>(
  ({ attendableId, classNames, ...props }, forwardedRef) => {
    const hasAttention = useHasAttention(attendableId);
    return (
      <Button
        {...props}
        variant={hasAttention ? 'primary' : 'ghost'}
        classNames={['shrink-0 pli-0 is-[--rail-action]', classNames]}
        ref={forwardedRef}
      />
    );
  },
);

export { PlankHeadingButton, plankHeadingIconProps };

export type { PlankHeadingButtonProps };
