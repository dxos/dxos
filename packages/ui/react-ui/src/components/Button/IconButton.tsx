//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import React, { forwardRef } from 'react';

import { useThemeContext } from '../../hooks/index.ts';
import { type ThemedClassName } from '../../util/index.ts';
import * as Icon from '../Icon/Icon.tsx';
import * as Tooltip from '../Tooltip/Tooltip.tsx';
import * as Button from './Button.tsx';
type IconButtonProps = Omit<Button.RootProps, 'children'> &
  Partial<Pick<Icon.RootProps, 'icon' | 'size'>> & {
    label: string;
    noTooltip?: boolean;
    iconOnly?: boolean;
    iconEnd?: boolean;
    iconClassNames?: ThemedClassName<any>['classNames'];
    /** @deprecated Remove (should be automatic in style.) */
    square?: boolean;
    /** Removes inline padding while keeping the control's height. */
    compact?: boolean;
    tooltipSide?: Tooltip.Side;
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

const LabelledIconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { size, icon, iconOnly, square, compact, iconEnd, iconClassNames, label, noTooltip: _, classNames, ...props },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    return (
      // `caretDown` stays in `props` so `Button` still renders the caret; the theme only reads it.
      <Button.Root
        {...props}
        classNames={tx('iconButton.root', { iconOnly, square, compact, caretDown: props.caretDown }, classNames)}
        ref={forwardedRef}
      >
        {icon && !iconEnd && <Icon.Root icon={icon} size={size} classNames={iconClassNames} />}
        <span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
        {icon && iconEnd && <Icon.Root icon={icon} size={size} classNames={iconClassNames} />}
      </Button.Root>
    );
  },
);

export { IconButton as Root };

export type { IconButtonProps as RootProps };

export * from './IconButton.theme.ts';
