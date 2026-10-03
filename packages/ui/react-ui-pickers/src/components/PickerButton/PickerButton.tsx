//
// Copyright 2025 DXOS.org
//

import React, { type FC, useEffect, useState } from 'react';

import { useControllableState } from '@dxos/react-hooks';
import { Button, Icon, type IconProps, Menu, type ThemedClassName, Tooltip } from '@dxos/react-ui';

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

/** Menu value of the reset row; outside every picker's value set. */
const RESET = '__reset__';

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
  iconSize,
}: PickerButtonProps) => {
  const [value, setValue] = useControllableState<string>({
    prop: valueProp,
    defaultProp: defaultValueProp,
    onChange,
  });
  // TODO(burdon): useControllableState doesn't update the prop when the value is changed. Replace it.
  useEffect(() => setValue(valueProp), [valueProp]);

  const [open, setOpen] = useState<boolean>(false);

  return (
    <Menu.Root open={open} onOpenChange={({ open }) => setOpen(open)} positioning={{ placement: 'bottom' }}>
      {/* The menu trigger is outermost: both machines find the button by its id, and the tooltip adopts
          the id it is handed while the menu would lose its own to one set above it. */}
      <Menu.Trigger asChild>
        <Tooltip.Trigger asChild content={label} side='bottom'>
          <Button
            variant={rootVariant === 'toolbar-button' ? 'ghost' : 'default'}
            iconOnly
            showTooltip={false}
            label={label}
            caretDown
            classNames={classNames}
            disabled={disabled}
          >
            {(value && <Component value={value} size={iconSize} />) || <Icon icon={icon} size={iconSize} />}
          </Button>
        </Tooltip.Trigger>
      </Menu.Trigger>
      <Menu.Content columns={6}>
        {values.map((_value) => {
          return (
            <Menu.CheckboxItem
              key={_value}
              item={{ value: _value, label: _value }}
              checked={_value === value}
              onCheckedChange={() => setValue(_value)}
            >
              <Component value={_value} size={iconSize} />
            </Menu.CheckboxItem>
          );
        })}
        {onReset && (
          <Menu.Item item={{ value: RESET, label: 'Reset' }} onClick={() => onReset()}>
            <Icon icon='ph--x--regular' size={iconSize} />
          </Menu.Item>
        )}
      </Menu.Content>
    </Menu.Root>
  );
};
