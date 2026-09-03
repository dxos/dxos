//
// Copyright 2026 DXOS.org
//

import * as SliderPrimitive from '@radix-ui/react-slider';
import React, { forwardRef } from 'react';

import { invariant } from '@dxos/invariant';

import { useThemeContext } from '../../hooks/index.ts';
import { type ThemedClassName } from '../../util/index.ts';

type SliderProps = ThemedClassName<SliderPrimitive.SliderProps> & {
  /**
   * Accessible name per thumb, by index — `role="slider"` has no visible text a label's `htmlFor`
   * can reach, so this is the only way to name it for assistive tech. Required whenever there is
   * more than one thumb; for the common single-thumb case, a plain `aria-label` works instead.
   */
  thumbLabels?: string[];
};

/** Range input built on the Radix slider primitive; supports one or more thumbs. */
const Slider = forwardRef<HTMLSpanElement, SliderProps>(
  (
    { classNames, orientation = 'horizontal', disabled, thumbLabels, 'aria-label': ariaLabel, ...props },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const styleProps = { orientation, disabled };
    const thumbCount = props.value?.length ?? props.defaultValue?.length ?? 1;

    // Every thumb must expose an accessible name: either one label per thumb, or (for the common
    // single-thumb case) a plain `aria-label` passthrough — never silently render an unnamed thumb.
    invariant(
      thumbLabels ? thumbLabels.length === thumbCount : thumbCount === 1 && ariaLabel !== undefined,
      thumbLabels
        ? `Slider: thumbLabels has ${thumbLabels.length} entries but ${thumbCount} thumb(s) are rendered.`
        : `Slider: pass thumbLabels (${thumbCount} entries) or, for a single thumb, aria-label.`,
    );

    const labelFor = (index: number) => thumbLabels?.[index] ?? ariaLabel;

    return (
      <SliderPrimitive.Root
        {...props}
        orientation={orientation}
        disabled={disabled}
        className={tx('slider.root', styleProps, classNames)}
        ref={forwardedRef}
      >
        <SliderPrimitive.Track className={tx('slider.track', styleProps)}>
          <SliderPrimitive.Range className={tx('slider.range', styleProps)} />
        </SliderPrimitive.Track>
        {Array.from({ length: thumbCount }, (_unused, index) => (
          <SliderPrimitive.Thumb key={index} className={tx('slider.thumb', styleProps)} aria-label={labelFor(index)} />
        ))}
      </SliderPrimitive.Root>
    );
  },
);

export type { SliderProps };

export { Slider };
