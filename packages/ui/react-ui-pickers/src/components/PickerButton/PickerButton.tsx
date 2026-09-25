//
// Copyright 2025 DXOS.org
//

import React, { type FC, useEffect, useState } from 'react';

import { useControllableState } from '@dxos/react-hooks';
import { Button, Icon, type IconProps, Menu, type ThemedClassName, Toolbar, Tooltip } from '@dxos/react-ui';

export type PickerButtonProps = ThemedClassName<{
  Component: FC<{ value: string; size?: IconProps['size'] }>;
  label: string;
  icon: string;
  values: readonly string[];
  disabled?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  onReset?: () => void;
  rootVariant?: 'button' | 'toolbar-button';
  iconSize?: IconProps['size'];
}>;

export const PickerButton = ({
  Component,
  disabled,
  classNames,
  defaultValue: defaultValueProp,
  value: valueProp,
  values,
  label,
  icon,
  onChange,
  onReset,
  rootVariant = 'button',
  iconSize = 5,
}: PickerButtonProps) => {
  const [value, setValue] = useControllableState<string>({
    prop: valueProp,
    defaultProp: defaultValueProp,
    onChange,
  });
  // TODO(burdon): useControllableState doesn't update the prop when the value is changed. Replace it.
  useEffect(() => setValue(valueProp), [valueProp]);

  const [open, setOpen] = useState<boolean>(false);
  const TriggerRoot = rootVariant === 'toolbar-button' ? Toolbar.Button : Button;

  return (
    <Menu.Root modal={false} open={open} onOpenChange={setOpen}>
      {/* The menu trigger is outermost: both machines find the button by its id, and the tooltip adopts
          the id it is handed while the menu would lose its own to one set above it. */}
      <Menu.Trigger asChild>
        <Tooltip.Trigger asChild content={label} side='bottom'>
          <TriggerRoot classNames={['gap-2 py-1', classNames]} disabled={disabled}>
            <span className='sr-only'>{label}</span>
            {(value && <Component value={value} size={iconSize} />) || <Icon icon={icon} size={iconSize} />}
            <Icon icon='ph--caret-down--bold' size={3} classNames='mx-0.5' />
          </TriggerRoot>
        </Tooltip.Trigger>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content side='bottom' classNames='!w-min'>
          <Menu.Viewport classNames='grid grid-cols-[repeat(6,min-content)]'>
            {values.map((_value) => {
              return (
                <Menu.CheckboxItem
                  key={_value}
                  checked={_value === value}
                  onCheckedChange={() => setValue(_value)}
                  classNames={'p-1 items-center justify-center aspect-square'}
                >
                  <Component value={_value} size={iconSize} />
                </Menu.CheckboxItem>
              );
            })}
            {onReset && (
              <Menu.CheckboxItem
                onCheckedChange={() => onReset()}
                classNames={'p-1 items-center justify-center aspect-square'}
              >
                <Icon icon='ph--x--regular' size={iconSize} />
              </Menu.CheckboxItem>
            )}
          </Menu.Viewport>
          <Menu.Arrow />
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
};
