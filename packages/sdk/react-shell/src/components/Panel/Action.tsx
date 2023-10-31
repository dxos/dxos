//
// Copyright 2023 DXOS.org
//

import { type IconProps } from '@phosphor-icons/react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type Dispatch, type FC, forwardRef, type SetStateAction } from 'react';

import { type ButtonProps, Button } from '@dxos/react-ui';

export type LargeButtonProps = ButtonProps & {
  isFull?: boolean;
};

export type ActionMenuItem = {
  label: string;
  description: string;
  icon: FC<IconProps>;
} & Pick<ButtonProps, 'onClick'>;

export type BifurcatedActionProps = {
  actions: Record<string, ActionMenuItem>;
  activeAction?: string;
  onChangeActiveAction?: Dispatch<SetStateAction<string>>;
  defaultActiveAction?: string;
} & Omit<LargeButtonProps, 'children' | 'onClick'>;

export const BifurcatedAction = forwardRef<HTMLButtonElement, BifurcatedActionProps>((props, forwardedRef) => {
  const {
    classNames,
    variant,
    isFull = true,
    actions,
    activeAction: propsActiveAction,
    onChangeActiveAction,
    defaultActiveAction,
    ...rest
  } = props;

  const resolvedVariant = variant ?? 'default';

  const [activeActionKey = Object.keys(actions)[0], _setActiveAction] = useControllableState({
    prop: propsActiveAction,
    onChange: onChangeActiveAction,
    defaultProp: defaultActiveAction,
  });

  const activeAction = actions[activeActionKey as string] ?? {};

  return (
    <Button
      {...rest}
      classNames={[
        isFull && 'is-full',
        'flex gap-2 plb-3 mbs-2',
        classNames,
        !props.disabled
          ? resolvedVariant === 'default'
            ? 'bg-neutral-25 hover:bg-white hover:text-primary-500 active:bg-neutral-25 dark:active:bg-neutral-800'
            : resolvedVariant === 'ghost'
            ? 'active:bg-neutral-125 dark:active:bg-neutral-800'
            : resolvedVariant === 'primary'
            ? 'active:bg-primary-700 dark:active:bg-primary-500'
            : ''
          : '',
      ]}
      ref={forwardedRef}
      variant={variant}
    >
      {<activeAction.icon />}
      {activeAction.label}
    </Button>
  );
});

export const Action = forwardRef<HTMLButtonElement, LargeButtonProps>((props, forwardedRef) => {
  const { children, classNames, variant, isFull = true, ...rest } = props;
  const resolvedVariant = variant ?? 'default';
  return (
    <Button
      {...rest}
      classNames={[
        isFull && 'is-full',
        'flex gap-2 plb-3 mbs-2',
        classNames,
        !props.disabled
          ? resolvedVariant === 'default'
            ? 'bg-neutral-25 hover:bg-white hover:text-primary-500 active:bg-neutral-25 dark:active:bg-neutral-800'
            : resolvedVariant === 'ghost'
            ? 'active:bg-neutral-125 dark:active:bg-neutral-800'
            : resolvedVariant === 'primary'
            ? 'active:bg-primary-700 dark:active:bg-primary-500'
            : ''
          : '',
      ]}
      ref={forwardedRef}
      variant={variant}
    >
      {children}
    </Button>
  );
});
