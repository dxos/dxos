//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Form, type FormFieldRenderer, useFormFieldState } from '@dxos/react-ui-form';
import * as Layout from '@dxos/react-ui/Layout';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';

import { type HorizontalAlign, NodeStyle, type VerticalAlign } from '../../model/types.ts';

export type IconToggleOption<T extends string> = { value: T; icon: string; label: string };

export type IconToggleProps<T extends string> = {
  label: string;
  options: readonly IconToggleOption<T>[];
  value?: T;
  readonly?: boolean;
  onValueChange: (value: T) => void;
};

/** One choice of a few, each an icon: a single-select toggle group whose pressed item is the value. */
export const IconToggle = <T extends string>({
  label,
  options,
  value,
  readonly,
  onValueChange,
}: IconToggleProps<T>) => (
  <ToggleGroup.Root
    type='single'
    value={value ?? ''}
    aria-label={label}
    onValueChange={(next) => {
      // Pressing the pressed item releases it in the group; the value stays what it was.
      const option = options.find((candidate) => candidate.value === next);
      if (option) {
        onValueChange(option.value);
      }
    }}
  >
    {options.map((option) => (
      <ToggleGroup.Item
        key={option.value}
        value={option.value}
        variant='ghost'
        icon={option.icon}
        iconOnly
        label={option.label}
        disabled={readonly}
        data-testid={`align-${option.value}`}
      />
    ))}
  </ToggleGroup.Root>
);

const HORIZONTAL: readonly IconToggleOption<HorizontalAlign>[] = [
  { value: 'left', icon: 'ph--align-left-simple--regular', label: 'Align left' },
  { value: 'center', icon: 'ph--align-center-vertical-simple--regular', label: 'Align centre' },
  { value: 'right', icon: 'ph--align-right-simple--regular', label: 'Align right' },
];

const VERTICAL: readonly IconToggleOption<VerticalAlign>[] = [
  { value: 'top', icon: 'ph--align-top-simple--regular', label: 'Align top' },
  { value: 'middle', icon: 'ph--align-center-horizontal-simple--regular', label: 'Align middle' },
  { value: 'bottom', icon: 'ph--align-bottom-simple--regular', label: 'Align bottom' },
];

/**
 * The text alignment, rendered at `style.alignHorizontal`: the horizontal and vertical toggles side by side in one
 * row (`style.alignVertical` is hidden), each pick writing the enclosing `style`, as the style grid does.
 */
export const AlignField: FormFieldRenderer = ({ jsonPath, readonly, onBlur }) => {
  const stylePath = (jsonPath ?? 'style.alignHorizontal').split('.').slice(0, -1);
  const styleField = useFormFieldState('AlignField', stylePath);
  const style: NodeStyle = styleField.getValue() ?? {};
  const update = (values: Partial<NodeStyle>) => {
    // A pick is a commit: a toggle never blurs, so it commits itself.
    styleField.onValueChange(NodeStyle.ast, { ...style, ...values });
    onBlur();
  };
  return (
    <Layout.Container
      layout='row'
      gutter='inherit'
      align='start'
      gap='md'
      columns='repeat(2, minmax(0, 1fr))'
      // The properties panel is narrow, and the two toggles fit side by side there, so the row never stacks.
      fixed
    >
      <Form.Field path={jsonPath} label='Horizontal' readonly={readonly}>
        <IconToggle
          label='Horizontal alignment'
          options={HORIZONTAL}
          value={style.alignHorizontal}
          readonly={!!readonly}
          onValueChange={(alignHorizontal) => update({ alignHorizontal })}
        />
      </Form.Field>
      <Form.Field path={[...stylePath, 'alignVertical'].join('.')} label='Vertical' readonly={readonly}>
        <IconToggle
          label='Vertical alignment'
          options={VERTICAL}
          value={style.alignVertical}
          readonly={!!readonly}
          onValueChange={(alignVertical) => update({ alignVertical })}
        />
      </Form.Field>
    </Layout.Container>
  );
};
