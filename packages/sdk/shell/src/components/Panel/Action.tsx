//
// Copyright 2023 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type Dispatch, type SetStateAction, forwardRef } from 'react';

import { Button, type ButtonProps, DropdownMenu, Icon, useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/react-ui-theme';

export type LargeButtonProps = ButtonProps & {
  isFull?: boolean;
};

export type ActionMenuItem = {
  label: string;
  description: string;
  icon: string;
  testId?: string;
} & Pick<ButtonProps, 'onClick'>;

export type BifurcatedActionProps = {
  actions: Record<string, ActionMenuItem>;
  activeAction?: string;
  onChangeActiveAction?: Dispatch<SetStateAction<string>>;
  defaultActiveAction?: string;
  'data-testid'?: string;
} & Omit<LargeButtonProps, 'children' | 'onClick'>;

const defaultActions = {
  noopAction: {
    label: 'No-op',
    description: '',
    icon: 'ph--placeholder--regular',
    onClick: () => {},
  },
} as Record<string, ActionMenuItem>;

export const BifurcatedAction = forwardRef<HTMLButtonElement, BifurcatedActionProps>((props, forwardedRef) => {
  const {
    classNames,
    variant,
    isFull = true,
    actions = defaultActions,
    activeAction: propsActiveAction,
    onChangeActiveAction,
    defaultActiveAction,
    'data-testid': testId,
    ...rest
  } = props;

  const dropdownTestId = testId && `${testId}.more`;

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
        classNames={['bs-11 flex-1 min-is-0 flex gap-2 rounded-ie-none', classNames]}
        ref={forwardedRef}
        variant={variant}
        data-testid={testId}
        onClick={activeAction.onClick}
      >
        {activeAction.icon && <Icon icon={activeAction.icon} size={5} />}
        <span>{activeAction.label}</span>
      </Button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button classNames={['bs-11 flex-none rounded-is-none', classNames]} data-testid={dropdownTestId}>
            <span className='sr-only'>{t('invite options label')}</span>
            <Icon icon='ph--caret-down--regular' size={4} />
          </Button>
        </DropdownMenu.Trigger>
        {/* TODO(thure): Putting `DropdownMenu.Portal` here breaks highlighting and focus. Why? */}
        <DropdownMenu.Portal>
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
                    data-testid={action.testId}
                  >
                    {action.icon && <Icon icon={action.icon} size={5} />}
                    <div role='none' className='flex-1 min-is-0 space-b-1'>
                      <p id={`${id}__label`}>{action.label}</p>
                      {action.description && (
                        <p id={`${id}__description`} className={descriptionText}>
                          {action.description}
                        </p>
                      )}
                    </div>
                    <DropdownMenu.ItemIndicator asChild>
                      <Icon icon='ph--check--regular' size={4} />
                    </DropdownMenu.ItemIndicator>
                  </DropdownMenu.CheckboxItem>
                );
              })}
            </DropdownMenu.Viewport>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
});

export const Action = forwardRef<HTMLButtonElement, LargeButtonProps>((props, forwardedRef) => {
  const { children, classNames, variant, isFull = true, ...rest } = props;
  return (
    <Button
      {...rest}
      classNames={[isFull && 'is-full', 'bs-11 flex gap-2 mbs-2', classNames]}
      ref={forwardedRef}
      variant={variant}
    >
      {children}
    </Button>
  );
});
