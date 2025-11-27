//
// Copyright 2024 DXOS.org
//

import React, { forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { Icon, type IconProps } from '../Icon';
import { Tooltip, type TooltipSide } from '../Tooltip';

import { Button, type ButtonProps } from './Button';

type IconButtonProps = Omit<ButtonProps, 'children'> &
  Partial<Pick<IconProps, 'icon' | 'size'>> & {
    label: string;
    noTooltip?: boolean;
    caretDown?: boolean;
    iconOnly?: boolean;
    iconEnd?: boolean;
    iconClassNames?: ThemedClassName<any>['classNames'];
    tooltipSide?: TooltipSide;
  };

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>((props, forwardedRef) =>
  props.iconOnly ? (
    <IconOnlyButton {...props} ref={forwardedRef} />
  ) : (
    <LabelledIconButton {...props} ref={forwardedRef} />
  ),
);

const IconOnlyButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ noTooltip, tooltipSide, ...props }, forwardedRef) => {
    if (noTooltip) {
      return <LabelledIconButton {...props} ref={forwardedRef} />;
    }

    return (
      <Tooltip.Trigger asChild content={props.label} side={tooltipSide}>
        <LabelledIconButton {...props} ref={forwardedRef} />
      </Tooltip.Trigger>
    );
  },
);

// TODO(burdon): Inherit size from container/density.
const LabelledIconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 5, icon, iconOnly, iconEnd, iconClassNames, label, caretDown, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <Button {...props} classNames={tx('iconButton.root', 'iconButton', { iconOnly }, classNames)} ref={forwardedRef}>
        {icon && !iconEnd && <Icon icon={icon} size={size} classNames={iconClassNames} />}
        <span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
        {icon && iconEnd && <Icon icon={icon} size={size} classNames={iconClassNames} />}
        {caretDown && <Icon size={3} icon='ph--caret-down--bold' />}
      </Button>
    );
  },
);

export { IconButton };

export type { IconButtonProps };
