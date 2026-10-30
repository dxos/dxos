//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { useControllableState } from '@dxos/react-hooks';
import * as Button from '@dxos/react-ui/Button';
import * as ColorPicker from '@dxos/react-ui/ColorPicker';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Popover from '@dxos/react-ui/Popover';
import type * as Util from '@dxos/react-ui/Util';
import { getSize, osTranslations } from '@dxos/ui-theme';

export type HuePickerProps = {
  /** Replaces the generic "select hue" label (tooltip and screen-reader text). */
  label?: string;
  disabled?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (nextHue: string) => void;
  onReset?: () => void;
  rootVariant?: 'button' | 'toolbar-button';
  iconSize?: Icon.IconProps['size'];
};

/** A swatch of the current hue that opens the theme's hues as a grid (the hue-only variant of `ColorPicker`). */
export const HuePicker = ({
  classNames,
  label,
  disabled,
  defaultValue,
  value: valueProp,
  onChange,
  onReset,
  rootVariant = 'button',
  iconSize,
}: Util.ThemedClassName<HuePickerProps>) => {
  const { t } = Hooks.useTranslation(osTranslations);
  const [value, setValue] = useControllableState<string>({ prop: valueProp, defaultProp: defaultValue, onChange });
  // TODO(burdon): useControllableState doesn't update the prop when the value is changed. Replace it.
  useEffect(() => setValue(valueProp), [valueProp]);
  const [open, setOpen] = useState(false);
  const triggerLabel = label ?? t('select-hue.label', { defaultValue: 'Select hue' });

  return (
    <Popover.Root open={open} onOpenChange={({ open }) => setOpen(open)} positioning={{ placement: 'bottom' }}>
      <Popover.Trigger asChild>
        <Button.Root
          variant={rootVariant === 'toolbar-button' ? 'ghost' : 'default'}
          iconOnly
          label={triggerLabel}
          caretDown
          classNames={classNames}
          disabled={disabled}
        >
          {value ? (
            <HuePreview value={value} size={iconSize} />
          ) : (
            <Icon.Icon icon='ph--palette--regular' size={iconSize} />
          )}
        </Button.Root>
      </Popover.Trigger>
      <Popover.Content classNames='flex flex-col gap-2 p-2'>
        <ColorPicker.HueGrid value={value} onValueChange={setValue} onCommit={() => setOpen(false)} />
        {onReset && (
          <Button.Root
            variant='ghost'
            icon='ph--x--regular'
            label={t('reset-hue.label', { defaultValue: 'Reset' })}
            disabled={!value}
            onClick={() => {
              onReset();
              setOpen(false);
            }}
          />
        )}
      </Popover.Content>
    </Popover.Root>
  );
};

/** Next icon sizes as the Tailwind steps the preview's square is drawn at. */
const PREVIEW_SIZES: Record<Util.Size, 3 | 3.5 | 4 | 5 | 6> = { xs: 3, sm: 3.5, md: 4, lg: 5, xl: 6 };

const HuePreview = ({ value, size: iconSize = 'md' }: { value: string; size?: Util.Size }) => {
  const size = PREVIEW_SIZES[iconSize];
  return (
    <div className='flex justify-center items-center'>
      <svg viewBox={`0 0 ${size} ${size}`} className={getSize(size)}>
        <rect x={0} y={0} width={size} height={size} fill={`var(--color-${value}-surface)`} strokeWidth={4} />
      </svg>
    </div>
  );
};
