//
// Copyright 2026 DXOS.org
//

import { Slider as SliderPrimitive } from '@ark-ui/react/slider';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { invariant } from '@dxos/invariant';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type SliderProps = ThemedClassName<
  Omit<ComponentPropsWithRef<'div'>, 'defaultValue' | 'dir' | 'onChange' | 'aria-labelledby'>
> & {
  /** Ids of the elements naming each thumb, by index. */
  'aria-labelledby'?: string[];
  'value'?: number[];
  'defaultValue'?: number[];
  'onValueChange'?: (value: number[]) => void;
  /** Fires once when a drag or key repeat ends. */
  'onValueCommit'?: (value: number[]) => void;
  'min'?: number;
  'max'?: number;
  'step'?: number;
  /** Least number of steps two thumbs keep between them. */
  'minStepsBetweenThumbs'?: number;
  'orientation'?: 'horizontal' | 'vertical';
  'disabled'?: boolean;
  'name'?: string;
  /**
   * Accessible name per thumb, by index — `role="slider"` has no visible text a label's `htmlFor`
   * can reach, so this is the only way to name it for assistive tech. Required whenever there is
   * more than one thumb; for the common single-thumb case, a plain `aria-label` works instead.
   */
  'thumbLabels'?: string[];
};

const THUMB_SIZE = { width: 12, height: 12 };

/** Range input on Ark's slider machine; supports one or more thumbs. */
const Slider = forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      classNames,
      value,
      defaultValue,
      onValueChange,
      onValueCommit,
      min,
      max,
      step,
      minStepsBetweenThumbs,
      orientation = 'horizontal',
      disabled,
      name,
      thumbLabels,
      'aria-label': ariaLabel,
      ...props
    },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const styleProps = { orientation, disabled };
    const thumbCount = value?.length ?? defaultValue?.length ?? 1;

    // Every thumb must expose an accessible name: either one label per thumb, or (for the common
    // single-thumb case) a plain `aria-label` passthrough — never silently render an unnamed thumb.
    invariant(
      thumbLabels ? thumbLabels.length === thumbCount : thumbCount === 1 && ariaLabel !== undefined,
      thumbLabels
        ? `Slider: thumbLabels has ${thumbLabels.length} entries but ${thumbCount} thumb(s) are rendered.`
        : `Slider: pass thumbLabels (${thumbCount} entries) or, for a single thumb, aria-label.`,
    );

    return (
      <SliderPrimitive.Root
        {...props}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange && (({ value }) => onValueChange(value))}
        onValueChangeEnd={onValueCommit && (({ value }) => onValueCommit(value))}
        min={min}
        max={max}
        step={step}
        minStepsBetweenThumbs={minStepsBetweenThumbs}
        orientation={orientation}
        disabled={disabled}
        name={name}
        // The machine names each thumb from this list, by index.
        aria-label={thumbLabels ?? (ariaLabel !== undefined ? [ariaLabel] : undefined)}
        // Told the thumb's size (h-3 w-3), the machine positions it from the first render instead of
        // hiding it until a measurement lands.
        thumbSize={THUMB_SIZE}
        className={tx('slider.root', styleProps, classNames)}
        ref={forwardedRef}
      >
        <SliderPrimitive.Control className={tx('slider.control', styleProps)}>
          <SliderPrimitive.Track className={tx('slider.track', styleProps)}>
            <SliderPrimitive.Range className={tx('slider.range', styleProps)} />
          </SliderPrimitive.Track>
          {Array.from({ length: thumbCount }, (_unused, index) => (
            <SliderPrimitive.Thumb key={index} index={index} className={tx('slider.thumb', styleProps)}>
              <SliderPrimitive.HiddenInput />
            </SliderPrimitive.Thumb>
          ))}
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    );
  },
);

Slider.displayName = 'Slider';

export { Slider };

export type { SliderProps };
