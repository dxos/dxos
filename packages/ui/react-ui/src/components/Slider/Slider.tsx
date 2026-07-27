//
// Copyright 2026 DXOS.org
//

import * as SliderPrimitive from '@radix-ui/react-slider';
import React, { forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type SliderProps = ThemedClassName<SliderPrimitive.SliderProps> & {
  /** Accessible name per thumb, by index — `role="slider"` has no visible text a label's `htmlFor` can reach. */
  thumbLabels?: string[];
};

/** Range input built on the Radix slider primitive; supports one or more thumbs. */
const Slider = forwardRef<HTMLSpanElement, SliderProps>(
  ({ classNames, orientation = 'horizontal', disabled, thumbLabels, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const styleProps = { orientation, disabled };
    const thumbCount = props.value?.length ?? props.defaultValue?.length ?? 1;
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
          <SliderPrimitive.Thumb
            key={index}
            className={tx('slider.thumb', styleProps)}
            aria-label={thumbLabels?.[index]}
          />
        ))}
      </SliderPrimitive.Root>
    );
  },
);

export type { SliderProps };

export { Slider };
