//
// Copyright 2025 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { Button, DropdownMenu, Icon, type IconProps, type ThemedClassName, Toolbar, Tooltip } from '@dxos/react-ui';

export type PickerButtonProps = ThemedClassName<{
  Component: FC<{ value: string; iconSize?: IconProps['size'] }>;
  label: string;
  icon: string;
  values: string[];
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
  defaultValue: _defaultValue,
  value: _value,
  values,
  label,
  icon,
  onChange,
  onReset,
  rootVariant = 'button',
  iconSize = 5,
}: PickerButtonProps) => {
  const [value, setValue] = useControllableState<string>({
    prop: _value,
    defaultProp: _defaultValue,
    onChange,
  });
  // TODO(burdon): useControllableState doesn't update the prop when the value is changed. Replace it.
  useEffect(() => setValue(_value), [_value]);

  const [open, setOpen] = useState<boolean>(false);

  const suppressNextTooltip = useRef<boolean>(false);
  const [triggerTooltipOpen, setTriggerTooltipOpen] = useState(false);

  const TriggerRoot = rootVariant === 'toolbar-button' ? Toolbar.Button : Button;

  return (
    <Tooltip.Root
      open={triggerTooltipOpen}
      onOpenChange={(nextOpen) => {
        if (suppressNextTooltip.current) {
          setTriggerTooltipOpen(false);
          suppressNextTooltip.current = false;
        } else {
          setTriggerTooltipOpen(nextOpen);
        }
      }}
    >
      <DropdownMenu.Root
        modal={false}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          suppressNextTooltip.current = true;
        }}
      >
        <Tooltip.Trigger asChild>
          <DropdownMenu.Trigger asChild>
            <TriggerRoot classNames={['gap-2 plb-1', classNames]} disabled={disabled}>
              <span className='sr-only'>{label}</span>
              {(value && <Component value={value} iconSize={iconSize} />) || <Icon icon={icon} size={iconSize} />}
              <Icon icon='ph--caret-down--bold' size={3} />
            </TriggerRoot>
          </DropdownMenu.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side='bottom'>
            {label}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
        <DropdownMenu.Portal>
          <DropdownMenu.Content side='bottom' classNames='!is-min'>
            <DropdownMenu.Viewport classNames='grid grid-cols-[repeat(6,min-content)]'>
              {values.map((_value) => {
                return (
                  <DropdownMenu.CheckboxItem
                    key={_value}
                    checked={_value === value}
                    onCheckedChange={() => setValue(_value)}
                    classNames={'p-1 items-center justify-center aspect-square'}
                  >
                    <Component value={_value} iconSize={iconSize} />
                  </DropdownMenu.CheckboxItem>
                );
              })}
              {onReset && (
                <DropdownMenu.CheckboxItem
                  onCheckedChange={() => onReset()}
                  classNames={'p-1 items-center justify-center aspect-square'}
                >
                  <Icon icon='ph--x--regular' size={iconSize} />
                </DropdownMenu.CheckboxItem>
              )}
            </DropdownMenu.Viewport>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </Tooltip.Root>
  );
};
