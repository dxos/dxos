//
// Copyright 2025 DXOS.org
//

import React, { type FC, useEffect, useState } from 'react';

import { useControllableState } from '@dxos/react-hooks';
import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Menu from '@dxos/react-ui/Menu';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import type * as Util from '@dxos/react-ui/Util';

export type PickerButtonProps = Util.ThemedClassName<{
  Component: FC<{ value: string; size?: Icon.IconProps['size'] }>;
  label: string;
  icon: string;
  values: readonly string[];
  disabled?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  onReset?: () => void;
  rootVariant?: 'button' | 'toolbar-button';
  iconSize?: Icon.IconProps['size'];
}>;

/** Menu value of the reset row; outside every picker's value set. */
const RESET = '__reset__';

/** The glyph size in the palette's cells, independent of the trigger's `iconSize`. */
const ITEM_SIZE = 'xl' satisfies Icon.IconProps['size'];

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
          <Button.Root
            variant={rootVariant === 'toolbar-button' ? 'ghost' : 'default'}
            iconOnly
            showTooltip={false}
            label={label}
            caretDown
            classNames={classNames}
            disabled={disabled}
          >
            {(value && <Component value={value} size={iconSize} />) || <Icon.Icon icon={icon} size={iconSize} />}
          </Button.Root>
        </Tooltip.Trigger>
      </Menu.Trigger>
      {/* A palette is picked by recognising a glyph, not by reading a label, so its cells and the glyphs
          in them each run a size above what the menu and the cell would otherwise give them. */}
      <Menu.Content size='lg' columns={6}>
        {values.map((_value) => {
          return (
            <Menu.CheckboxItem
              key={_value}
              item={{ value: _value, label: _value }}
              checked={_value === value}
              onCheckedChange={() => setValue(_value)}
            >
              <Component value={_value} size={ITEM_SIZE} />
            </Menu.CheckboxItem>
          );
        })}
        {onReset && (
          <Menu.Item item={{ value: RESET, label: 'Reset' }} onClick={() => onReset()}>
            <Icon.Icon icon='ph--x--regular' size={ITEM_SIZE} />
          </Menu.Item>
        )}
      </Menu.Content>
    </Menu.Root>
  );
};
