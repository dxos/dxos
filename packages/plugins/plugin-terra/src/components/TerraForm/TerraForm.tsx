//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import { IconButton, Input, Slider } from '@dxos/react-ui';
import { Form, type FormFieldMap, type FormFieldRendererProps } from '@dxos/react-ui-form';

import { Terra } from '#types';

export type TerraFormProps = {
  config: Terra.TerraConfig;
  onChange: (values: Terra.TerraConfig) => void;
  /** Water sheen is a scene-only effect, not a stored config field. */
  onWaterSheen?: (enabled: boolean) => void;
};

type SliderKey = 'waterLevel' | 'elevationScale' | 'mountainScale' | 'treeDensity' | 'resolution';

type SliderSpec = { min: number; max: number; step: number; decimals: number };

// Ranges/steps for the five numeric fields that were previously Babylon-GUI sliders (Task 10 spike values).
const SLIDER_SPECS: Record<SliderKey, SliderSpec> = {
  waterLevel: { min: 0.2, max: 0.7, step: 0.01, decimals: 2 },
  elevationScale: { min: 0.05, max: 0.3, step: 0.01, decimals: 2 },
  mountainScale: { min: 0, max: 1.5, step: 0.05, decimals: 2 },
  treeDensity: { min: 0, max: 1, step: 0.05, decimals: 2 },
  resolution: { min: 64, max: 512, step: 64, decimals: 0 },
};

const FORM_SCHEMA = Terra.TerraConfig.pipe(
  Schema.pick('seed', 'waterLevel', 'elevationScale', 'mountainScale', 'treeDensity', 'resolution'),
);

type TerraFormValues = Schema.Schema.Type<typeof FORM_SCHEMA>;

/** Increments the trailing numeric suffix of a seed string, appending one if none is present. */
const nextSeed = (seed: string): string => {
  const match = seed.match(/^(.*?)(\d+)$/);
  if (!match) {
    return `${seed}-1`;
  }
  const [, prefix, digits] = match;
  return `${prefix}${Number(digits) + 1}`;
};

/**
 * Renders a numeric field as a `Slider` with a live readout in place of the schema's default numeric
 * input. Delegates the label/status/validation chrome to `Form.Row`'s render-prop (field mode) — it,
 * not this renderer, wraps the row in `Input.Root`, which `Input.Label`/`Input.DescriptionAndValidation`
 * require via context. Rendering those parts (or anything relying on them) outside `Form.Row` throws.
 */
const createSliderField = (key: SliderKey): FormFieldMap[string] => {
  const spec = SLIDER_SPECS[key];
  const SliderField = ({ type, onValueChange, ...rowProps }: FormFieldRendererProps<number>) => {
    const handleValueChange = useCallback(([next]: number[]) => onValueChange(type, next), [type, onValueChange]);
    return (
      <Form.Row<number>
        {...rowProps}
        renderStatic={(value) => <p className='tabular-nums'>{(value ?? spec.min).toFixed(spec.decimals)}</p>}
      >
        {({ value }) => {
          const current = value ?? spec.min;
          return (
            <div className='flex flex-col gap-1 w-full'>
              <div className='flex justify-end'>
                <span className='text-sm text-description tabular-nums'>{current.toFixed(spec.decimals)}</span>
              </div>
              <Slider
                value={[current]}
                min={spec.min}
                max={spec.max}
                step={spec.step}
                onValueChange={handleValueChange}
              />
            </div>
          );
        }}
      </Form.Row>
    );
  };
  SliderField.displayName = `TerraForm.SliderField(${key})`;
  return SliderField;
};

const FIELD_MAP: FormFieldMap = {
  waterLevel: createSliderField('waterLevel'),
  elevationScale: createSliderField('elevationScale'),
  mountainScale: createSliderField('mountainScale'),
  treeDensity: createSliderField('treeDensity'),
  resolution: createSliderField('resolution'),
};

/** Config panel for `Terra.TerraConfig`: sliders for the numeric spike parameters, a seed field plus reseed button, and a water-sheen toggle (scene-only, not persisted config). */
export const TerraForm = ({ config, onChange, onWaterSheen }: TerraFormProps) => {
  const handleValuesChanged = useCallback(
    (values: Partial<TerraFormValues>, { isValid }: { isValid: boolean }) => {
      if (!isValid) {
        return;
      }
      onChange(values);
    },
    [onChange],
  );

  const handleReseed = useCallback(() => {
    onChange({ seed: nextSeed(config.seed ?? 'terra') });
  }, [config.seed, onChange]);

  const handleWaterSheenChange = useCallback((checked: boolean) => onWaterSheen?.(checked), [onWaterSheen]);

  return (
    <div className='flex flex-col gap-4 p-4 w-72'>
      <Form.Root<TerraFormValues>
        schema={FORM_SCHEMA}
        values={config}
        fieldMap={FIELD_MAP}
        onValuesChanged={handleValuesChanged}
      >
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>

      <IconButton icon='ph--arrow-clockwise--regular' label='Reseed' onClick={handleReseed} />

      <Input.Root>
        <div className='flex items-center gap-2'>
          <Input.Checkbox onCheckedChange={handleWaterSheenChange} />
          <Input.Label>Water sheen</Input.Label>
        </div>
      </Input.Root>
    </div>
  );
};

TerraForm.displayName = 'TerraForm';
