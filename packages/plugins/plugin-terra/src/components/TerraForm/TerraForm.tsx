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
  /** Fires with only the changed fields — callers must merge, not replace, the existing config. */
  onChange: (patch: Partial<Terra.TerraConfig>) => void;
  /** Water sheen is a scene-only effect, not a stored config field. */
  onWaterSheen?: (enabled: boolean) => void;
};

type SliderKey = 'waterLevel' | 'elevationScale' | 'mountainScale' | 'treeDensity' | 'resolution';

type SliderSpec = { min: number; max: number; step: number; decimals: number; label: string };

// Ranges/steps for the five numeric fields that were previously Babylon-GUI sliders (Task 10 spike values).
// `label` mirrors the schema's `title` annotation, used as the slider thumb's accessible name.
const SLIDER_SPECS: Record<SliderKey, SliderSpec> = {
  waterLevel: { min: 0.2, max: 0.7, step: 0.01, decimals: 2, label: 'Water level' },
  elevationScale: { min: 0.05, max: 0.3, step: 0.01, decimals: 2, label: 'Elevation scale' },
  mountainScale: { min: 0, max: 1.5, step: 0.05, decimals: 2, label: 'Mountain scale' },
  treeDensity: { min: 0, max: 1, step: 0.05, decimals: 2, label: 'Tree density' },
  resolution: { min: 64, max: 512, step: 64, decimals: 0, label: 'Resolution' },
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
 * Renders a numeric field as a `Slider` with a live readout on the label line, in place of the
 * schema's default numeric input. Delegates the label/status/validation chrome to `Form.Row`'s
 * render-prop (field mode) — it, not this renderer, wraps the row in `Input.Root`, which
 * `Input.Label`/`Input.DescriptionAndValidation` require via context. Rendering those parts (or
 * anything relying on them) outside `Form.Row` throws.
 */
const createSliderField = (key: SliderKey): FormFieldMap[string] => {
  const spec = SLIDER_SPECS[key];
  const SliderField = ({ type, getValue, onValueChange, ...rowProps }: FormFieldRendererProps<number>) => {
    const current = getValue() ?? spec.min;
    const handleValueChange = useCallback(([next]: number[]) => onValueChange(type, next), [type, onValueChange]);
    return (
      <Form.Row<number>
        {...rowProps}
        getValue={getValue}
        // A sibling of the label text (never a child) — keeps `Input.Label`'s `textContent` exactly
        // `label` and avoids re-deriving the input's accessible name on every drag frame.
        labelEnd={<span className='text-sm text-description tabular-nums'>{current.toFixed(spec.decimals)}</span>}
        renderStatic={(value) => <p className='tabular-nums'>{(value ?? spec.min).toFixed(spec.decimals)}</p>}
      >
        {({ value }) => (
          <Slider
            value={[value ?? spec.min]}
            min={spec.min}
            max={spec.max}
            step={spec.step}
            onValueChange={handleValueChange}
            thumbLabels={[spec.label]}
          />
        )}
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
    // Semi-transparent floating surface (mirrors plugin-voxel's canvas-overlay HUD chrome) so
    // labels stay legible over the rendered planet regardless of terrain color underneath.
    <div className='flex flex-col gap-4 p-3 w-72 bg-base-surface/70 backdrop-blur-sm rounded-md shadow-md border border-separator'>
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
