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
  Pick<IconProps, 'icon' | 'size'> & {
    label: string;
    iconOnly?: boolean;
    noTooltip?: boolean;
    caretDown?: boolean;
    iconClassNames?: ThemedClassName<any>['classNames'];
    tooltipPortal?: boolean;
    tooltipSide?: TooltipSide;
  };

const IconOnlyButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ noTooltip, tooltipPortal = true, tooltipSide, ...props }, forwardedRef) => {
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

const LabelledIconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size, iconOnly, label, classNames, iconClassNames, caretDown, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <Button {...props} classNames={tx('iconButton.root', 'iconButton', { iconOnly }, classNames)} ref={forwardedRef}>
        <Icon icon={icon} size={size} classNames={iconClassNames} />
        <span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
        {caretDown && <Icon size={3} icon='ph--caret-down--bold' />}
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
