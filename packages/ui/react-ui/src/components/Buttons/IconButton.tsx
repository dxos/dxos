//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, type ReactNode, type MutableRefObject, useState } from 'react';

import { Button, type ButtonProps } from './Button';
import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { Icon, type IconProps } from '../Icon';
import { Tooltip } from '../Tooltip';

type IconButtonProps = Omit<ButtonProps, 'children'> &
  Pick<IconProps, 'icon' | 'size'> & {
    label: NonNullable<ReactNode>;
    iconOnly?: boolean;
    caretDown?: boolean;
    // TODO(burdon): Create slots abstraction?
    iconClassNames?: ThemedClassName<any>['classNames'];
    tooltipPortal?: boolean;
    tooltipZIndex?: string;
    suppressNextTooltip?: MutableRefObject<boolean>;
  };

const IconOnlyButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ tooltipPortal = true, tooltipZIndex: zIndex, suppressNextTooltip, ...props }, forwardedRef) => {
    const [triggerTooltipOpen, setTriggerTooltipOpen] = useState(false);
    const content = (
      <Tooltip.Content {...(zIndex && { style: { zIndex } })}>
        {props.label}
        <Tooltip.Arrow />
      </Tooltip.Content>
    );
    return (
      <Tooltip.Root
        open={triggerTooltipOpen}
        onOpenChange={(nextOpen) => {
          if (suppressNextTooltip?.current) {
            setTriggerTooltipOpen(false);
            suppressNextTooltip.current = false;
          } else {
            setTriggerTooltipOpen(nextOpen);
          }
        }}
      >
        <Tooltip.Trigger asChild>
          <LabelledIconButton {...props} ref={forwardedRef} />
        </Tooltip.Trigger>
        {tooltipPortal ? <Tooltip.Portal>{content}</Tooltip.Portal> : content}
      </Tooltip.Root>
    );
  },
);

const LabelledIconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { icon, size, iconOnly, label, classNames, iconClassNames, caretDown, suppressNextTooltip, ...props },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    return (
      <Button {...props} classNames={tx('iconButton.root', 'iconButton', {}, classNames)} ref={forwardedRef}>
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
