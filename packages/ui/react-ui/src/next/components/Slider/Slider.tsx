//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Slider as SliderPrimitive } from '@ark-ui/react/slider';
import React, { type ReactNode, forwardRef, useId } from 'react';

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
        // Centred thumbs need no measurement, so their size can come from CSS; the control's margin keeps them in.
        thumbAlignment='center'
        className={mx(recipes.slider(), classNames)}
        ref={forwardedRef}
      >
        {label && <SliderPrimitive.Label className={recipes.sliderLabel()}>{label}</SliderPrimitive.Label>}
        <SliderPrimitive.Control className={recipes.sliderControl()}>
          <SliderPrimitive.Track className={recipes.sliderTrack()}>
            <SliderPrimitive.Range className={recipes.sliderRange()} />
          </SliderPrimitive.Track>
          {Array.from({ length: thumbCount }, (_unused, index) => (
            <SliderPrimitive.Thumb key={index} index={index} className={recipes.sliderThumb()}>
              <SliderPrimitive.HiddenInput />
            </SliderPrimitive.Thumb>
          ))}
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    );
  },
);

Slider.displayName = 'Slider';
