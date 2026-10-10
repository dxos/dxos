//
// Copyright 2026 DXOS.org
//

import { Slider as SliderPrimitive } from '@ark-ui/react/slider';
import React, { type ReactNode, forwardRef, useId, useLayoutEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';

export type SliderProps = ThemedClassName<
  Omit<
    SliderPrimitive.RootProps,
    | 'children'
    | 'value'
    | 'defaultValue'
    | 'onValueChange'
    | 'onValueChangeEnd'
    | 'aria-label'
    | 'aria-labelledby'
    | 'thumbAlignment'
    | 'thumbSize'
  >
> & {
  /** One entry per thumb. */
  'value'?: number[];
  'defaultValue'?: number[];
  'onValueChange'?: (value: number[]) => void;
  /** Fires once when a drag or key repeat ends. */
  'onValueCommit'?: (value: number[]) => void;
  /** Visible label above the track; names a single thumb. */
  'label'?: ReactNode;
  /** Names a single thumb without a visible label. */
  'aria-label'?: string;
  /**
   * Accessible name per thumb, by index: `role="slider"` has no text a label's `htmlFor` can reach. Required whenever
   * there is more than one thumb; with a visible `label` too, each thumb reads as "<thumb label> <label>".
   */
  'thumbLabels'?: string[];
};

/**
 * Ark's slider as a leaf control: an optional label above a block-tall row holding the track, its range and one thumb
 * per value. Every thumb must be named, so a missing name throws rather than rendering an unlabelled control.
 */
/** Thumb size assumed until it is measured (the default-density icon size); also where layout is unavailable. */
const DEFAULT_THUMB_SIZE = { width: 16, height: 16 };

export const Slider = forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      classNames,
      value,
      defaultValue,
      onValueChange,
      onValueCommit,
      label,
      'aria-label': ariaLabel,
      thumbLabels,
      orientation = 'horizontal',
      id: idProp,
      ...props
    },
    forwardedRef,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const thumbCount = value?.length ?? defaultValue?.length ?? 1;
    invariant(
      thumbLabels ? thumbLabels.length === thumbCount : thumbCount === 1 && (!!label || ariaLabel !== undefined),
      thumbLabels
        ? `Slider: thumbLabels has ${thumbLabels.length} entries but ${thumbCount} thumb(s) are rendered.`
        : `Slider: pass thumbLabels (${thumbCount} entries) or, for a single thumb, label or aria-label.`,
    );

    // The machine points every thumb at the label; with per-thumb names too, each thumb names itself first so two
    // thumbs under one label stay distinguishable.
    const ids = { label: `${id}-label`, thumb: (index: number) => `${id}-thumb-${index}` };
    const labelledBy =
      label && thumbLabels ? thumbLabels.map((_label, index) => `${ids.thumb(index)} ${ids.label}`) : undefined;

    // Contained thumbs need their size. Left to the machine, it hides every thumb until a non-zero measurement
    // arrives, which never happens without layout (jsdom), so the thumbs vanish; measuring here and passing the
    // size keeps them visible, starting from the default size.
    const [thumbSize, setThumbSize] = useState(DEFAULT_THUMB_SIZE);
    const thumbRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
      const thumb = thumbRef.current;
      if (!thumb) {
        return;
      }
      const measure = () => {
        const { offsetWidth: width, offsetHeight: height } = thumb;
        if (width > 0 && height > 0) {
          setThumbSize((current) =>
            current.width === width && current.height === height ? current : { width, height },
          );
        }
      };
      measure();
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(measure);
      observer.observe(thumb);
      return () => observer.disconnect();
    }, []);

    return (
      <SliderPrimitive.Root
        {...props}
        id={id}
        ids={ids}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange && (({ value }) => onValueChange(value))}
        onValueChangeEnd={onValueCommit && (({ value }) => onValueCommit(value))}
        orientation={orientation}
        aria-label={thumbLabels ?? (ariaLabel !== undefined ? [ariaLabel] : undefined)}
        aria-labelledby={labelledBy}
        // Thumbs stay within the track, so the track spans the full width and lines up with the label.
        thumbAlignment='contain'
        thumbSize={thumbSize}
        className={mx(recipes.slider(), classNames)}
        ref={forwardedRef}
      >
        {label && <SliderPrimitive.Label className={recipes.sliderLabel()}>{label}</SliderPrimitive.Label>}
        <SliderPrimitive.Control className={recipes.sliderControl()}>
          <SliderPrimitive.Track className={recipes.sliderTrack()}>
            <SliderPrimitive.Range className={recipes.sliderRange()} />
          </SliderPrimitive.Track>
          {Array.from({ length: thumbCount }, (_unused, index) => (
            <SliderPrimitive.Thumb
              key={index}
              index={index}
              className={recipes.sliderThumb()}
              ref={index === 0 ? thumbRef : undefined}
            >
              <SliderPrimitive.HiddenInput />
            </SliderPrimitive.Thumb>
          ))}
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    );
  },
);

Slider.displayName = 'Slider';
