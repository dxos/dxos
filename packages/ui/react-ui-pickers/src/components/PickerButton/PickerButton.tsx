//
// Copyright 2025 DXOS.org
//

import React, { type FC, useEffect, useState } from 'react';

import { useControllableState } from '@dxos/react-hooks';
import { Next, type ThemedClassName } from '@dxos/react-ui';

export type PickerButtonProps = ThemedClassName<{
  Component: FC<{ value: string; size?: Next.IconProps['size'] }>;
  label: string;
  icon: string;
  values: readonly string[];
  disabled?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  onReset?: () => void;
  rootVariant?: 'button' | 'toolbar-button';
  iconSize?: Next.IconProps['size'];
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
    <Next.Menu.Root open={open} onOpenChange={({ open }) => setOpen(open)} positioning={{ placement: 'bottom' }}>
      {/* The menu trigger is outermost: both machines find the button by its id, and the tooltip adopts
          the id it is handed while the menu would lose its own to one set above it. */}
      <Next.Menu.Trigger asChild>
        <Next.Tooltip.Trigger asChild content={label} side='bottom'>
          <Next.Button
            variant={rootVariant === 'toolbar-button' ? 'ghost' : 'default'}
            iconOnly
            showTooltip={false}
            label={label}
            caretDown
            classNames={classNames}
            disabled={disabled}
          >
            {(value && <Component value={value} size={iconSize} />) || <Next.Icon icon={icon} size={iconSize} />}
          </Next.Button>
        </Next.Tooltip.Trigger>
      </Next.Menu.Trigger>
      <Next.Menu.Content columns={6}>
        {values.map((_value) => {
          return (
            <Next.Menu.CheckboxItem
              key={_value}
              item={{ value: _value, label: _value }}
              checked={_value === value}
              onCheckedChange={() => setValue(_value)}
            >
              <Component value={_value} size={iconSize} />
            </Next.Menu.CheckboxItem>
          );
        })}
        {onReset && (
          <Next.Menu.Item
            item={{ value: RESET, label: 'Reset' }}
            onClick={() => onReset()}
          >
            <Next.Icon icon='ph--x--regular' size={iconSize} />
          </Next.Menu.Item>
        )}
      </Next.Menu.Content>
    </Next.Menu.Root>
  );
};
