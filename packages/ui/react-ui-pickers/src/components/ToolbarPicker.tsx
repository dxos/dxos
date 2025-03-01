//
// Copyright 2025 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { DropdownMenu, Icon, type ThemedClassName, Toolbar, Tooltip } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type ToolbarPickerProps = {
  Component: FC<{ value: string }>;
  label: string;
  icon: string;
  values: string[];
  disabled?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  onReset?: () => void;
};

export const ToolbarPickerButton = ({
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
}: ThemedClassName<ToolbarPickerProps>) => {
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
            <Toolbar.Button classNames={mx('gap-2 plb-1', classNames)} disabled={disabled}>
              <span className='sr-only'>{label}</span>
              {(value && <Component value={value} />) || <Icon icon={icon} size={5} />}
            </Toolbar.Button>
          </DropdownMenu.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side='bottom'>
            {label}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
        <DropdownMenu.Portal>
          <DropdownMenu.Content side='bottom' classNames='!w-40'>
            <DropdownMenu.Viewport classNames='grid grid-cols-6'>
              {values.map((_value) => {
                return (
                  <DropdownMenu.CheckboxItem
                    key={_value}
                    checked={_value === value}
                    onCheckedChange={() => setValue(_value)}
                    classNames={'!p-0 items-center justify-center'}
                  >
                    <Component value={_value} />
                  </DropdownMenu.CheckboxItem>
                );
              })}
              {onReset && (
                <DropdownMenu.CheckboxItem
                  onCheckedChange={() => onReset()}
                  classNames={'!p-0 items-center justify-center'}
                >
                  <Icon icon='ph--x--regular' size={5} />
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
