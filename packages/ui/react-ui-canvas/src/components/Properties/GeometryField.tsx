//
// Copyright 2026 DXOS.org
//

//
// The geometry controls of the properties panel: a node's `center` and `size` as two labelled number
// cells rather than a collapsible fieldset each. The canvas owns them rather than `react-ui-form`
// because they answer to the grid — the arrows step by a minor cell and Shift by a major one, exactly
// as an arrow nudge moves a selected node, and a committed value snaps while snapping is on. A generic
// two-column control would have to be told all of that from the outside.
//

import React, { type ChangeEvent, type KeyboardEvent, useCallback, useEffect, useState } from 'react';

import { Field } from '@dxos/react-ui';
import { Form, type FormFieldRenderer } from '@dxos/react-ui-form';

import { DEFAULT_GRID, MAJOR_GRID_RATIO } from '../../model/types.ts';

/** A finite number, or undefined for text that is not one yet (`''`, `-`, `1.`). */
const parse = (text: string): number | undefined => {
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : undefined;
};

/** The cell labels of the geometry a node carries; the key order is the reading order. */
const LABELS: Record<string, string> = {
  x: 'X',
  y: 'Y',
  width: 'W',
  height: 'H',
};

export type GeometryFieldOptions = {
  /** Minor grid spacing; one arrow press. Shift presses by `MAJOR_GRID_RATIO` of it. */
  grid?: number;
  /** Round a committed value to the minor grid, as a drag does. */
  snap?: boolean;
};

/**
 * A `{x, y}` or `{width, height}` pair as one row of two labelled number cells. Text is held locally
 * while typing, so a half-typed `-` or `1.` is not parsed into the model, and the model wins whenever
 * it changes underneath (a drag moving the node this panel is showing).
 */
export const createGeometryField =
  ({ grid = DEFAULT_GRID, snap = false }: GeometryFieldOptions = {}): FormFieldRenderer =>
  ({ type, label, jsonPath, readonly, getValue, onValueChange, onBlur }) => {
    const values: Record<string, number> = getValue() ?? {};
    const keys = Object.keys(values);
    const [text, setText] = useState<Record<string, string>>({});
    // The model is the source of truth: re-seed the text whenever it changes, so a drag is reflected here.
    useEffect(() => {
      setText(Object.fromEntries(keys.map((key) => [key, String(values[key] ?? 0)])));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keys.map((key) => values[key]).join()]);

    const commit = useCallback(
      (key: string, next: number) => onValueChange(type, { ...getValue(), [key]: next }),
      [type, getValue, onValueChange],
    );

    const handleChange = useCallback(
      (key: string) => (event: ChangeEvent<HTMLInputElement>) => {
        const input = event.target.value;
        setText((text) => ({ ...text, [key]: input }));
        // An incomplete number is text the user is still writing, not a value.
        if (input !== '' && input !== '-') {
          const value = parse(input);
          if (value !== undefined) {
            commit(key, value);
          }
        }
      },
      [commit],
    );

    /**
     * Arrow keys step by the grid, as they nudge a selected node; the browser's own step would not.
     * A press is a complete gesture like a toggle, so it saves at once rather than waiting for blur —
     * the node moves under each press instead of jumping when focus finally leaves.
     */
    const handleKeyDown = useCallback(
      (key: string) => (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
          return;
        }
        event.preventDefault();
        const unit = event.shiftKey ? grid * MAJOR_GRID_RATIO : grid;
        const current = parse(text[key] ?? '') ?? 0;
        const next = (event.key === 'ArrowUp' ? current + unit : current - unit) + 0;
        setText((text) => ({ ...text, [key]: String(next) }));
        commit(key, next);
        onBlur();
      },
      [grid, text, commit, onBlur],
    );

    /** A committed value lands on the grid, so typing a number leaves the node as snapped as dragging it. */
    const handleBlur = useCallback(
      (key: string) => (event: React.FocusEvent<HTMLInputElement>) => {
        const current = parse(text[key] ?? '');
        if (current !== undefined) {
          const next = snap ? Math.round(current / grid) * grid + 0 : current;
          setText((text) => ({ ...text, [key]: String(next) }));
          commit(key, next);
        }
        onBlur(event);
      },
      [snap, grid, text, commit, onBlur],
    );

    return (
      <Form.Field path={jsonPath} label={label} readonly={readonly}>
        <div className='grid grid-cols-2 gap-form-gap'>
          {keys.map((key) => (
            // `Field.Root` lays out as `contents`, so each cell needs its own box in the grid.
            <div key={key}>
              <Field.Root>
                <Field.Label>{LABELS[key] ?? key}</Field.Label>
                <Field.Input
                  type='number'
                  step={grid}
                  disabled={!!readonly}
                  value={text[key] ?? ''}
                  onChange={handleChange(key)}
                  onKeyDown={handleKeyDown(key)}
                  onBlur={handleBlur(key)}
                />
              </Field.Root>
            </div>
          ))}
        </div>
      </Form.Field>
    );
  };
