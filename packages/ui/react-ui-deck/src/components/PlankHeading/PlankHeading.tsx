//
// Copyright 2024 DXOS.org
//

import { type IconProps } from '@phosphor-icons/react';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { Button, type ButtonProps, type ThemedClassName } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { useHasAttention } from '../Attention';

type AttendableId = { attendableId: string };

type PlankHeadingButtonProps = Omit<ButtonProps, 'variant'> & AttendableId;

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
        classNames={['m-1 shrink-0 pli-0 min-bs-0 is-[--rail-action] bs-[--rail-action]', classNames]}
        ref={forwardedRef}
      />
    );
  },
);

type PlankHeadingLabelProps = ThemedClassName<ComponentPropsWithRef<'h1'>> & AttendableId;

const PlankHeadingLabel = forwardRef<HTMLHeadingElement, PlankHeadingLabelProps>(
  ({ attendableId, classNames, ...props }, forwardedRef) => {
    const hasAttention = useHasAttention(attendableId);
    return (
      <h1
        {...props}
        data-attention={hasAttention.toString()}
        className={mx('pli-1 min-is-0 flex-1 truncate font-medium fg-base data-[attention=true]:fg-accent', classNames)}
        ref={forwardedRef}
      />
    );
  },
);

export const PlankHeading = { Button: PlankHeadingButton, Label: PlankHeadingLabel };
export { plankHeadingIconProps };

export type { PlankHeadingButtonProps };
