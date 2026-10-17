//
// Copyright 2023 DXOS.org
//

import React, { type ComponentProps, type Dispatch, type SetStateAction, forwardRef } from 'react';

import { useControllableState } from '@dxos/react-hooks';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Menu from '@dxos/react-ui/Menu';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations.ts';

// TODO(burdon): Move to react-ui.

type LargeButtonProps = ComponentProps<typeof Button.Root> & {
  isFull?: boolean;
};

export type ActionMenuItem = {
  label: string;
  description: string;
  icon: string;
  testId?: string;
} & Pick<Button.RootProps, 'onClick'>;

const defaultActions = {
  noopAction: {
    label: 'No-op',
    description: '',
    icon: 'ph--circle-dashed--regular',
    onClick: () => {},
  },
} as Record<string, ActionMenuItem>;

//
// BifurcatedAction
//

export type BifurcatedActionProps = {
  'actions': Record<string, ActionMenuItem>;
  'activeAction'?: string;
  'onChangeActiveAction'?: Dispatch<SetStateAction<string>>;
  'defaultActiveAction'?: string;
  'data-testid'?: string;
} & Omit<LargeButtonProps, 'children' | 'onClick'>;

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

  const { t } = Hooks.useTranslation(translationKey);

  return (
    <div className={mx('flex gap-px items-center', isFull && 'w-full')}>
      <Button.Root
        {...rest}
        classNames={['h-11 flex-1 min-w-0 flex gap-2 rounded-ie-none', classNames]}
        ref={forwardedRef}
        variant={variant}
        data-testid={testId}
        onClick={activeAction.onClick}
      >
        {activeAction.icon && <Icon.Icon icon={activeAction.icon} />}
        <span>{activeAction.label}</span>
      </Button.Root>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button.Root
            iconSize='md'
            label={t('invite-options.label')}
            icon='ph--caret-down--regular'
            iconOnly
            variant={variant}
            classNames={['h-11 flex-none rounded-w-none', classNames]}
            data-testid={dropdownTestId}
          />
        </Menu.Trigger>
        {/* TODO(thure): Putting `Menu.Portal` here breaks highlighting and focus. Why? */}
        <Menu.Content>
          {Object.entries(actions).map(([id, action]) => {
            return (
              <Menu.CheckboxItem
                key={id}
                item={{ value: id, label: action.label, icon: action.icon }}
                aria-labelledby={`${id}__label`}
                aria-describedby={`${id}__description`}
                checked={activeActionKey === id}
                onCheckedChange={(checked) => checked && setActiveAction(id)}
                classNames='gap-2'
                data-testid={action.testId}
              >
                {action.icon && <Icon.Icon icon={action.icon} />}
                <div className='flex-1 min-w-0 space-b-1'>
                  <p id={`${id}__label`}>{action.label}</p>
                  {action.description && (
                    <p id={`${id}__description`} className='text-fg-muted'>
                      {action.description}
                    </p>
                  )}
                </div>
                <Menu.ItemIndicator asChild>
                  <Icon.Icon icon='ph--check--regular' size='md' />
                </Menu.ItemIndicator>
              </Menu.CheckboxItem>
            );
          })}
        </Menu.Content>
      </Menu.Root>
    </div>
  );
});
