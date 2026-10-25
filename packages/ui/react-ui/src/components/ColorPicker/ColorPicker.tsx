//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import {
  type Color,
  ColorPicker as ColorPickerPrimitive,
  parseColor,
  useColorPickerContext as useArkColorPickerContext,
} from '@ark-ui/react/color-picker';
import { Portal } from '@ark-ui/react/portal';
import React, {
  type KeyboardEvent,
  type PropsWithChildren,
  type ReactNode,
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createContext } from '@dxos/react-hooks';
import { mx } from '@dxos/ui-theme';
import { type ChromaticPalette, type NeutralPalette, type ThemedClassName, hues as allHues } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { Button } from '../Button/Button.tsx';
import { Input } from '../Input/Input.tsx';
import * as Tabs from '../Tabs/Tabs.tsx';
import * as Toolbar from '../Toolbar/Toolbar.tsx';

//
// Root
//

/** Shown in the picker when the value is unset or is not a color the picker can parse. */
const FALLBACK = '#808080';

const toColor = (value: string | undefined): Color => {
  try {
    return parseColor(value ?? FALLBACK);
  } catch {
    return parseColor(FALLBACK);
  }
};

type ColorPickerContextValue = {
  /** Any CSS color string, as typed; undefined when unset. */
  value?: string;
  onValueChange?: (value: string | undefined) => void;
  /** Called when a pick in the popover ends (a drag released), so a caller can save once rather than per move. */
  onValueCommit?: (value: string | undefined) => void;
  disabled?: boolean;
};

const COLOR_PICKER_NAME = 'ColorPicker';

const [ColorPickerProvider, useColorPickerContext] = createContext<ColorPickerContextValue>(COLOR_PICKER_NAME);

type ColorPickerRootProps = PropsWithChildren<ColorPickerContextValue>;

/**
 * A color value edited as text (any CSS color) or picked from the trigger's popover. The picker's machine lives here
 * (in a box with no layout of its own) so the trigger can be a bare button in an Input's end adornment.
 */
const ColorPickerRoot = ({ children, ...context }: ColorPickerRootProps) => {
  const { value, onValueChange, onValueCommit, disabled } = context;
  const color = useMemo(() => toColor(value), [value]);
  return (
    <ColorPickerProvider {...context}>
      <ColorPickerPrimitive.Root
        value={color}
        disabled={disabled}
        onValueChange={({ value: next }) => onValueChange?.(next.toString('hex'))}
        onValueChangeEnd={({ value: next }) => onValueCommit?.(next.toString('hex'))}
        positioning={{ placement: 'bottom-end' }}
        className='contents'
      >
        {children}
        <ColorPickerPrimitive.HiddenInput />
      </ColorPickerPrimitive.Root>
    </ColorPickerProvider>
  );
};

ColorPickerRoot.displayName = 'ColorPicker.Root';

//
// Input
//

type ColorPickerInputProps = ThemedClassName<{
  'placeholder'?: string;
  /** The input's end adornment, typically `ColorPicker.Trigger`. */
  'end'?: ReactNode;
  'data-testid'?: string;
}>;

/** The color as text, so a value the swatch cannot show (a named or `oklch` color) can still be typed. */
const ColorPickerInput = forwardRef<HTMLInputElement, ColorPickerInputProps>(
  ({ classNames, placeholder, end, ...props }, forwardedRef) => {
    const { value, onValueChange, disabled } = useColorPickerContext(COLOR_PICKER_NAME);
    return (
      <Input
        {...props}
        ref={forwardedRef}
        variant='mono'
        noAutoFill
        spellCheck={false}
        disabled={disabled}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(event) => onValueChange?.(event.target.value.trim() || undefined)}
        end={end}
        classNames={classNames}
      />
    );
  },
);

ColorPickerInput.displayName = 'ColorPicker.Input';

//
// Trigger
//

/** A swatch row: a theme hue or the neutral ramp. */
type SwatchHue = ChromaticPalette | NeutralPalette;

/** The theme's tones the swatches offer by default, light to dark. */
const DEFAULT_TONES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** The rows the swatches offer by default: neutral, then every theme hue. */
const DEFAULT_HUES: SwatchHue[] = ['neutral', ...allHues];

/** A popover view: the saturation/brightness area with a hue slider, or the theme swatch grid. */
type ColorPickerView = 'wheel' | 'swatches';

const DEFAULT_VIEWS: ColorPickerView[] = ['wheel', 'swatches'];

type ColorPickerTriggerProps = ThemedClassName<{
  label?: string;
  /** Names the button at the end of the tab row that clears the value back to unset. */
  resetLabel?: string;
  /** Rows of the swatch grid; neutral, then every theme hue, by default. */
  hues?: SwatchHue[];
  /** Columns of the swatch grid: theme tones (e.g. `500`), light to dark. */
  tones?: number[];
  /** The views the popover offers, as tabs; with one, it shows that view alone (e.g. swatches only). Both by default. */
  views?: ColorPickerView[];
}>;

/**
 * A swatch of the current color that opens two tabs: a wheel (a saturation/brightness area and a hue slider, which
 * write hex) and a grid of the theme's hues by tone.
 */
const ColorPickerTrigger = ({
  classNames,
  label = 'Pick color',
  resetLabel = 'Reset',
  hues,
  tones,
  views = DEFAULT_VIEWS,
}: ColorPickerTriggerProps) => {
  const { value, onValueChange, onValueCommit } = useColorPickerContext(COLOR_PICKER_NAME);
  return (
    <>
      {/* A direct child of the adornment, so it sizes, hovers and sits flush at the end like every Input end button. */}
      <ColorPickerPrimitive.Trigger asChild>
        <Button
          variant='ghost'
          iconOnly
          showTooltip={false}
          label={label}
          icon={value ? 'ph--square--fill' : 'ph--square--regular'}
          // The square takes the color; unset, it is hollow.
          style={value ? { color: value } : undefined}
          classNames={classNames}
        />
      </ColorPickerPrimitive.Trigger>
      <Portal>
        <ColorPickerPrimitive.Positioner>
          <ColorPickerPrimitive.Content
            data-surface='popup'
            className={mx(recipes.popup(), recipes.popoverContent(), 'p-2')}
          >
            {/* Keyed by the views, so a change of views starts again on the first one rather than keeping a missing tab. */}
            <Tabs.Root key={views.join()} defaultValue={views[0]} size='sm'>
              <Toolbar.Root size='sm'>
                {views.length > 1 && (
                  <Tabs.List aria-label={label}>
                    {views.includes('wheel') && (
                      <Tabs.Trigger value='wheel' icon='ph--palette--regular' label='Wheel' iconOnly />
                    )}
                    {views.includes('swatches') && (
                      <Tabs.Trigger value='swatches' icon='ph--swatches--regular' label='Swatches' iconOnly />
                    )}
                  </Tabs.List>
                )}
                <Toolbar.Separator variant='gap' />
                <Button
                  variant='ghost'
                  iconOnly
                  icon='ph--minus-circle--regular'
                  label={resetLabel}
                  disabled={value === undefined}
                  onClick={() => {
                    onValueChange?.(undefined);
                    onValueCommit?.(undefined);
                  }}
                />
              </Toolbar.Root>
              {views.includes('wheel') && (
                <Tabs.Content value='wheel' classNames='flex flex-col gap-2 pt-2'>
                  <ColorPickerPrimitive.Area className='relative size-48 rounded-sm overflow-hidden'>
                    <ColorPickerPrimitive.AreaBackground className='size-full' />
                    <ColorPickerPrimitive.AreaThumb className='size-3 rounded-full border-2 border-white shadow' />
                  </ColorPickerPrimitive.Area>
                  <ColorPickerPrimitive.ChannelSlider channel='hue' className='relative h-3 w-48'>
                    <ColorPickerPrimitive.ChannelSliderTrack className='h-full rounded-full' />
                    <ColorPickerPrimitive.ChannelSliderThumb className='size-3 -translate-y-1/2 rounded-full border-2 border-white shadow' />
                  </ColorPickerPrimitive.ChannelSlider>
                </Tabs.Content>
              )}
              {views.includes('swatches') && (
                <Tabs.Content value='swatches' classNames='pt-2'>
                  <Swatches
                    value={value}
                    hues={hues ?? DEFAULT_HUES}
                    tones={tones ?? DEFAULT_TONES}
                    onPick={(next) => {
                      onValueChange?.(next);
                      onValueCommit?.(next);
                    }}
                  />
                </Tabs.Content>
              )}
            </Tabs.Root>
          </ColorPickerPrimitive.Content>
        </ColorPickerPrimitive.Positioner>
      </Portal>
    </>
  );
};

/** The current swatch, ringed like focus (selection follows focus) and raised over its neighbours. */
const SELECTED_STYLE = {
  zIndex: 10,
  outline: 'var(--dx-focus-ring-width) solid var(--dx-focus-ring-color)',
  outlineOffset: '1px',
};

type SwatchesProps = {
  hues: SwatchHue[];
  tones: number[];
  /** The current color, ringed (and focused) when it is one of the swatches. */
  value?: string;
  /** A pick, or `undefined` when Escape restores an unset value. */
  onPick: (color: string | undefined) => void;
};

/**
 * One row per hue, one column per tone; a pick writes the tone's resolved color, since a value must not be a `var()`.
 * The grid is the wheel's width whatever the tone count, and rows stay one swatch tall, so fewer tones widen the cells.
 * A radio group whose selection follows focus: arrow keys pick as they move, Enter closes the popover keeping the pick,
 * and Escape closes it restoring the color it opened with.
 */
const Swatches = ({ hues, tones, value, onPick }: SwatchesProps) => {
  const { open, setOpen } = useArkColorPickerContext();
  const gridRef = useRef<HTMLDivElement>(null);
  // The color the popover opened with, for Escape to restore; the grid stays mounted across openings.
  const initialValue = useRef(value);
  useEffect(() => {
    if (open) {
      initialValue.current = value;
    }
    // Only an opening re-reads the value; picks while open must not move the restore point.
  }, [open]);
  const names = useMemo(() => hues.flatMap((hue) => tones.map((tone) => `${hue}-${tone}`)), [hues, tones]);

  // The swatches' colors as values: a stored color is a resolved string, so the selection is found by comparing them.
  const [resolved, setResolved] = useState<string[]>([]);
  useLayoutEffect(() => {
    const style = gridRef.current && getComputedStyle(gridRef.current);
    setResolved(style ? names.map((name) => style.getPropertyValue(`--color-${name}`).trim()) : []);
  }, [names]);

  const selected = value === undefined ? -1 : resolved.indexOf(value);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (selected >= 0) {
      setActive(selected);
    }
  }, [selected]);

  const select = (index: number) => {
    setActive(index);
    gridRef.current?.querySelectorAll<HTMLButtonElement>('button')[index]?.focus();
    if (resolved[index]) {
      onPick(resolved[index]);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const columns = tones.length;
    const last = names.length - 1;
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    if (event.key in step) {
      event.preventDefault();
      select(Math.min(last, Math.max(0, active + step[event.key])));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      select(event.key === 'Home' ? 0 : last);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Escape') {
      // The picker's own Escape handling then closes the popover.
      onPick(initialValue.current);
    }
  };

  return (
    <div
      ref={gridRef}
      role='radiogroup'
      className='grid w-48 gap-0.5'
      style={{ gridTemplateColumns: `repeat(${tones.length}, minmax(0, 1fr))`, gridAutoRows: '1rem' }}
      onKeyDown={handleKeyDown}
    >
      {names.map((name, index) => (
        <button
          key={name}
          type='button'
          role='radio'
          aria-checked={index === selected}
          aria-label={name}
          title={name}
          // Roving focus: Tab enters the grid at the current (or selected) swatch, and arrows move within it.
          tabIndex={index === active ? 0 : -1}
          // A cell is too small for the inset focus ring, so focus and selection ring it outside, raised over its neighbours.
          className='relative rounded-xs outline-none focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--dx-focus-ring-color)'
          style={{
            backgroundColor: `var(--color-${name})`,
            ...(index === selected && SELECTED_STYLE),
          }}
          onClick={() => select(index)}
        />
      ))}
    </div>
  );
};

ColorPickerTrigger.displayName = 'ColorPicker.Trigger';

//
// Exports
//

export { ColorPickerInput as Input, ColorPickerRoot as Root, ColorPickerTrigger as Trigger, useColorPickerContext };

export { DEFAULT_HUES, DEFAULT_TONES };

export type { SwatchHue, ColorPickerView as View };

export type {
  ColorPickerInputProps as InputProps,
  ColorPickerRootProps as RootProps,
  ColorPickerTriggerProps as TriggerProps,
};
