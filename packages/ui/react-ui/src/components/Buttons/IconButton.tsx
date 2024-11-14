//
// Copyright 2024 DXOS.org
//

import React, { forwardRef } from 'react';

import { Button, type ButtonProps } from './Button';
import { useThemeContext } from '../../hooks';
import { Icon, type IconProps } from '../Icon';
import { Tooltip } from '../Tooltip';

type IconButtonProps = Omit<ButtonProps, 'children'> &
  Pick<IconProps, 'icon'> & { label: string; iconOnly?: boolean; tooltipPortal?: boolean; tooltipZIndex?: string };

const IconOnlyButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ tooltipPortal, tooltipZIndex: zIndex, ...props }, forwardedRef) => {
    const content = (
      <Tooltip.Content {...(zIndex && { style: { zIndex } })}>
        {props.label}
        <Tooltip.Arrow />
      </Tooltip.Content>
    );
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <LabelledIconButton {...props} ref={forwardedRef} />
        </Tooltip.Trigger>
        {tooltipPortal ? <Tooltip.Portal>{content}</Tooltip.Portal> : content}
      </Tooltip.Root>
    );
  },
);

const LabelledIconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, iconOnly, label, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <Button {...props} classNames={tx('iconButton.root', 'iconButton', {}, classNames)} ref={forwardedRef}>
        <Icon icon={icon} />
        <span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
      </Button>
    );
  },
);

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>((props, forwardedRef) =>
  props.iconOnly ? (
    <IconOnlyButton {...props} ref={forwardedRef} />
  ) : (
    <LabelledIconButton {...props} ref={forwardedRef} />
  ),
);

export { IconButton };

export type { IconButtonProps };
