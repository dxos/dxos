//
// Copyright 2023 DXOS.org
//

import { CaretDown, Check, type IconProps } from '@phosphor-icons/react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type Dispatch, type FC, forwardRef, type SetStateAction } from 'react';

import { type ButtonProps, Button, type ComponentFragment, DropdownMenu, useTranslation } from '@dxos/react-ui';
import { descriptionText, getSize, mx } from '@dxos/react-ui-theme';

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

const buttonColorFragment: ComponentFragment<LargeButtonProps> = (props: LargeButtonProps) => {
  const resolvedVariant = props.variant ?? 'default';
  return [
    !props.disabled
      ? resolvedVariant === 'default'
        ? 'bg-neutral-25 hover:bg-white hover:text-primary-500 active:bg-neutral-25 dark:active:bg-neutral-800'
        : resolvedVariant === 'ghost'
        ? 'active:bg-neutral-125 dark:active:bg-neutral-800'
        : resolvedVariant === 'primary'
        ? 'active:bg-primary-700 dark:active:bg-primary-500'
        : ''
      : '',
  ];
};

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

  const [activeActionKey = Object.keys(actions)[0], setActiveAction] = useControllableState({
    prop: propsActiveAction,
    onChange: onChangeActiveAction,
    defaultProp: defaultActiveAction,
  });

  const activeAction = actions[activeActionKey as string] ?? {};

  const { t } = useTranslation('os');

  return (
    <div role='none' className={mx('mbs-2 flex gap-px items-center', isFull && 'is-full')}>
      <Button
        {...rest}
        classNames={['bs-11 flex-1 min-is-0 flex gap-2 rounded-ie-none', classNames, ...buttonColorFragment(props)]}
        ref={forwardedRef}
        variant={variant}
        onClick={activeAction.onClick}
      >
        {<activeAction.icon />}
        {activeAction.label}
      </Button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button classNames={['bs-11 flex-none rounded-is-none', classNames, ...buttonColorFragment(props)]}>
            <span className='sr-only'>{t('invite options label')}</span>
            <CaretDown />
          </Button>
        </DropdownMenu.Trigger>
        {/* TODO(thure): Putting `DropdownMenu.Portal` here breaks highlighting and focus. Why? */}
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            {Object.entries(actions).map(([id, action]) => {
              return (
                <DropdownMenu.CheckboxItem
                  key={id}
                  aria-labelledby={`${id}__label`}
                  aria-describedby={`${id}__description`}
                  checked={activeActionKey === id}
                  onCheckedChange={(checked) => checked && setActiveAction(id)}
                  classNames='gap-2'
                >
                  <action.icon className={getSize(5)} />
                  <div role='none' className='flex-1 min-is-0 space-b-1'>
                    <p id={`${id}__label`}>{action.label}</p>
                    {action.description && (
                      <p id={`${id}__description`} className={descriptionText}>
                        {action.description}
                      </p>
                    )}
                  </div>
                  <DropdownMenu.ItemIndicator asChild>
                    <Check />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.CheckboxItem>
              );
            })}
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
});

export const Action = forwardRef<HTMLButtonElement, LargeButtonProps>((props, forwardedRef) => {
  const { children, classNames, variant, isFull = true, ...rest } = props;
  return (
    <Button
      {...rest}
      classNames={[isFull && 'is-full', 'bs-11 flex gap-2 mbs-2', classNames, ...buttonColorFragment(props)]}
      ref={forwardedRef}
      variant={variant}
    >
      {children}
    </Button>
  );
});
