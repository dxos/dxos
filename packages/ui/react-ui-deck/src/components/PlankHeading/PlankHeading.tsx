//
// Copyright 2024 DXOS.org
//

import { type IconProps } from '@phosphor-icons/react';
import React, { forwardRef } from 'react';

import { Button, type ButtonProps } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { useHasAttention } from '../Attention';

type PlankHeadingButtonProps = Omit<ButtonProps, 'variant'> & { attendableId: string };

const plankHeadingIconProps: IconProps = {
  className: getSize(5),
  weight: 'duotone',
};

const PlankHeadingButton = forwardRef<HTMLButtonElement, PlankHeadingButtonProps>(
  ({ attendableId, classNames, ...props }, forwardedRef) => {
    const hasAttention = useHasAttention(attendableId);
    return (
      <Button
        {...props}
        variant={hasAttention ? 'primary' : 'ghost'}
        classNames={['shrink-0 pli-0 is-[--rail-action] bs-[--rail-action] min-bs-0', classNames]}
        ref={forwardedRef}
      />
    );
  },
);

export { PlankHeadingButton, plankHeadingIconProps };

export type { PlankHeadingButtonProps };
