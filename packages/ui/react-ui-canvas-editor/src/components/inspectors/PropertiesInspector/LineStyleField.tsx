//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';

import { Form, type FormFieldRenderer, SelectControl, useFormFieldState } from '@dxos/react-ui-form';
import { Corners, type Dash, DASHES, Fill, Stroke, strokeDash } from '@dxos/scene';

import { StyleSwitch } from '../../StyleGrid/index.ts';

/** Unset: the style set's own line for the element (`borderStyle`), stored as no value. */
const DEFAULT_VALUE = 'default';

const LINE_STYLE_ITEMS = [
  { value: DEFAULT_VALUE, label: 'Default' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

const isStroke = Schema.is(Stroke);

/**
 * The dash a border was last shown with, kept while the border is off: `stroke` holds the dash or `none`, never both,
 * so turning the border back on has nowhere else to find the line it had.
 */
type DashMemoryValue = { dash?: Dash; remember: (dash: Dash | undefined) => void };
const DashMemoryContext = createContext<DashMemoryValue>({ remember: () => {} });

/** Holds the border's last dash for the form under it; mounted per selection, so one selection's never reaches another. */
export const DashMemory = ({ children }: PropsWithChildren) => {
  const [dash, remember] = useState<Dash>();
  const memory = useMemo(() => ({ dash, remember }), [dash]);
  return <DashMemoryContext.Provider value={memory}>{children}</DashMemoryContext.Provider>;
};

/**
 * What turning a frame toggle on writes, from the selected kinds: nothing where every kind draws its fill or border
 * unset, so the field is cleared, and `solid` where one draws none unless its look asks (a bare or outline kind).
 */
export type FrameDefaults = { fill?: Fill; stroke?: Stroke };
export const FrameDefaultsContext = createContext<FrameDefaults>({});

/**
 * The line style, rendered at `overrides.stroke`, with `Default` (unset) as an option, as the font field offers the
 * body face. A border that is off shows the dash it last had, which turning it on restores.
 */
export const LineStyleField: FormFieldRenderer = ({ jsonPath, label, readonly }) => {
  const field = useFormFieldState('LineStyleField', (jsonPath ?? 'overrides.stroke').split('.'));
  const memory = useContext(DashMemoryContext);
  const value: unknown = field.getValue();
  const dash = (isStroke(value) ? strokeDash(value) : undefined) ?? (value === 'none' ? memory.dash : undefined);
  return (
    <Form.Field path={jsonPath} label={label} readonly={readonly}>
      <SelectControl
        items={LINE_STYLE_ITEMS}
        value={dash ?? DEFAULT_VALUE}
        readonly={readonly}
        onValueChange={(next) => {
          // A pick never blurs, so it commits itself.
          field.onValueChange(
            Stroke.ast,
            DASHES.find((candidate) => candidate === next),
          );
          field.onBlur();
        }}
      />
    </Form.Field>
  );
};

const drawn = (value: unknown) => value !== 'none';

/**
 * A frame's three toggles, rendered at `overrides.fill` in the panel's own order: Rounded (`overrides.corners`), Fill,
 * and Border, which shares `overrides.stroke` with the line style. The form shows each value as it is drawn, so a
 * toggle is on unless its value is `none`.
 */
export const FrameTogglesField: FormFieldRenderer = ({ jsonPath, readonly }) => {
  const stylePath = (jsonPath ?? 'overrides.fill').split('.').slice(0, -1);
  const memory = useContext(DashMemoryContext);
  const defaults = useContext(FrameDefaultsContext);
  return (
    <>
      <StyleSwitch<Corners>
        path={[...stylePath, 'corners']}
        type={Corners.ast}
        label='Rounded'
        readonly={readonly}
        isOn={drawn}
        valueFor={(on) => (on ? 'all' : 'none')}
      />
      <StyleSwitch<Fill>
        path={[...stylePath, 'fill']}
        type={Fill.ast}
        label='Fill'
        readonly={readonly}
        isOn={drawn}
        valueFor={(on) => (on ? defaults.fill : 'none')}
      />
      <StyleSwitch<Stroke>
        path={[...stylePath, 'stroke']}
        type={Stroke.ast}
        label='Border'
        readonly={readonly}
        isOn={drawn}
        valueFor={(on) => (on ? (memory.dash ?? defaults.stroke) : 'none')}
        onToggle={(previous, on) => !on && memory.remember(isStroke(previous) ? strokeDash(previous) : undefined)}
      />
    </>
  );
};
