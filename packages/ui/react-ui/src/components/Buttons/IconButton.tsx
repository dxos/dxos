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
    iconOnly?: boolean;
    noTooltip?: boolean;
    caretDown?: boolean;
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
  ({ icon, size = 4, iconOnly, label, classNames, iconClassNames, caretDown, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <Button {...props} classNames={tx('iconButton.root', 'iconButton', { iconOnly }, classNames)} ref={forwardedRef}>
        {icon && <Icon icon={icon} size={size} classNames={iconClassNames} />}
        <span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
        {caretDown && <Icon size={3} icon='ph--caret-down--bold' />}
      </Button>
    );
  },
);

export { IconButton };

export type { IconButtonProps };
