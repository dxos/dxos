//
// Copyright 2023 DXOS.org
//

import * as ToolbarPrimitive from '@radix-ui/react-toolbar';
import React, { forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import {
  Button,
  ButtonGroup,
  type ButtonGroupProps,
  type ButtonProps,
  Toggle,
  type ToggleGroupItemProps,
  type ToggleProps,
} from '../Buttons';
import { Link, type LinkProps } from '../Link';
import { Separator, type SeparatorProps } from '../Separator';

type ToolbarRootProps = ThemedClassName<ToolbarPrimitive.ToolbarProps>;

const ToolbarRoot = forwardRef<HTMLDivElement, ToolbarRootProps>(({ classNames, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <ToolbarPrimitive.Root {...props} className={tx('toolbar.root', 'toolbar', {}, classNames)} ref={forwardedRef}>
      {children}
    </ToolbarPrimitive.Root>
  );
});

type ToolbarButtonProps = ButtonProps;

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>((props, forwardedRef) => {
  return (
    <ToolbarPrimitive.Button asChild>
      <Button {...props} ref={forwardedRef} />
    </ToolbarPrimitive.Button>
  );
});

type ToolbarToggleProps = ToggleProps;

const ToolbarToggle = forwardRef<HTMLButtonElement, ToolbarToggleProps>((props, forwardedRef) => {
  return (
    <ToolbarPrimitive.Button asChild>
      <Toggle {...props} ref={forwardedRef} />
    </ToolbarPrimitive.Button>
  );
});

type ToolbarLinkProps = LinkProps;

const ToolbarLink = forwardRef<HTMLAnchorElement, ToolbarLinkProps>((props, forwardedRef) => {
  return (
    <ToolbarPrimitive.Link asChild>
      <Link {...props} ref={forwardedRef} />
    </ToolbarPrimitive.Link>
  );
});

type ToolbarToggleGroupProps = (
  | Omit<ToolbarPrimitive.ToolbarToggleGroupSingleProps, 'className'>
  | Omit<ToolbarPrimitive.ToolbarToggleGroupMultipleProps, 'className'>
) &
  ButtonGroupProps;

const ToolbarToggleGroup = forwardRef<HTMLDivElement, ToolbarToggleGroupProps>(
  ({ classNames, children, elevation, ...props }, forwardedRef) => {
    return (
      <ToolbarPrimitive.ToolbarToggleGroup {...props} asChild>
        <ButtonGroup {...{ classNames, children, elevation }} ref={forwardedRef} />
      </ToolbarPrimitive.ToolbarToggleGroup>
    );
  },
);

type ToolbarToggleGroupItemProps = ToggleGroupItemProps;

const ToolbarToggleGroupItem = forwardRef<HTMLButtonElement, ToolbarToggleGroupItemProps>(
  ({ variant, density, elevation, classNames, children, ...props }, forwardedRef) => {
    return (
      <ToolbarPrimitive.ToolbarToggleItem {...props} asChild>
        <Button {...{ variant, density, elevation, classNames, children }} ref={forwardedRef} />
      </ToolbarPrimitive.ToolbarToggleItem>
    );
  },
);

type ToolbarSeparatorProps = SeparatorProps;

const ToolbarSeparator = (props: SeparatorProps) => {
  return (
    <ToolbarPrimitive.Separator asChild>
      <Separator orientation='vertical' {...props} />
    </ToolbarPrimitive.Separator>
  );
};

export const Toolbar = {
  Root: ToolbarRoot,
  Button: ToolbarButton,
  Link: ToolbarLink,
  Toggle: ToolbarToggle,
  ToggleGroup: ToolbarToggleGroup,
  ToggleGroupItem: ToolbarToggleGroupItem,
  Separator: ToolbarSeparator,
};

export type {
  ToolbarRootProps,
  ToolbarButtonProps,
  ToolbarLinkProps,
  ToolbarToggleProps,
  ToolbarToggleGroupProps,
  ToolbarToggleGroupItemProps,
  ToolbarSeparatorProps,
};
