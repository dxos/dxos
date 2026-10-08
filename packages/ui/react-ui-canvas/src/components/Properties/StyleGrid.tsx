//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Form, type FormFieldRenderer, useFormFieldState } from '@dxos/react-ui-form';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import { mx } from '@dxos/ui-theme';

import { NodeStyle, type NodeTone, STYLE_HUES, type StyleHue } from '../../model/types.ts';
import { DEFAULT_TONE, TONE_NAMES, TONES, hueClasses } from '../../utils/style.ts';

export type StyleChoice = { hue: StyleHue; tone: NodeTone };

const SEPARATOR = ':';

const choiceKey = ({ hue, tone }: StyleChoice) => `${hue}${SEPARATOR}${tone}`;

const parseChoice = (key: string): StyleChoice | undefined => {
  const [hue, tone] = key.split(SEPARATOR);
  const styleHue = STYLE_HUES.find((candidate) => candidate === hue);
  const nodeTone = TONES.find((candidate) => String(candidate) === tone);
  return styleHue !== undefined && nodeTone !== undefined ? { hue: styleHue, tone: nodeTone } : undefined;
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The pressed item keeps the panel's background; the selection is drawn around the swatch instead. */
const ITEM_CLASSES = 'min-w-0 px-0 aria-checked:bg-transparent aria-checked:hover:bg-hover-surface';

export type StyleGridProps = {
  hue?: string;
  /** Unset is the default tone, as the frame draws it. */
  tone?: NodeTone;
  /** Several nodes disagree: no swatch is selected until one is picked. */
  indeterminate?: boolean;
  readonly?: boolean;
  /** The rows offered; all tones by default, or one row (e.g. a line's outline colour only). */
  tones?: readonly NodeTone[];
  onValueChange: (choice: StyleChoice) => void;
};

/**
 * Each offered hue in a column and its tones down the rows, every swatch drawn with the classes the node
 * itself would take, so a pick is a preview. A hue the grid does not offer, or none, selects nothing.
 */
export const StyleGrid = ({
  hue,
  tone = DEFAULT_TONE,
  indeterminate,
  readonly,
  tones = TONES,
  onValueChange,
}: StyleGridProps) => {
  const selected = indeterminate || !hue ? '' : `${hue}${SEPARATOR}${tone}`;
  return (
    <ToggleGroup.Root
      type='single'
      classNames='grid grid-cols-9 gap-1'
      value={selected}
      aria-label='Style'
      data-testid='style-grid'
      onValueChange={(next) => {
        // Pressing the selected swatch again deselects it in the group; the style keeps its value.
        const choice = parseChoice(next);
        if (choice) {
          onValueChange(choice);
        }
      }}
    >
      {tones.flatMap((rowTone) =>
        STYLE_HUES.map((columnHue) => {
          const key = choiceKey({ hue: columnHue, tone: rowTone });
          const classes = hueClasses(columnHue, rowTone);
          return (
            <ToggleGroup.Item
              key={key}
              value={key}
              variant='ghost'
              classNames={ITEM_CLASSES}
              disabled={readonly}
              data-style-option={key}
            >
              <span
                role='img'
                aria-label={`${capitalize(columnHue)}, ${TONE_NAMES[rowTone]}`}
                className={mx(
                  'size-5 rounded-xs border-2',
                  classes.surface,
                  classes.border,
                  selected === key && 'outline-2 outline-offset-2 outline-primary-500',
                )}
              />
            </ToggleGroup.Item>
          );
        }),
      )}
    </ToggleGroup.Root>
  );
};

/**
 * The properties panel's style field, rendered at `style.hue`: one pick sets the hue and its tone together,
 * so it writes the enclosing `style`.
 */
export const StyleGridField: FormFieldRenderer = ({ label, jsonPath, readonly, indeterminate, getValue, onBlur }) => {
  // Hue and tone change together, so the pick writes their parent once; two field writes would race.
  const stylePath = (jsonPath ?? 'style.hue').split('.').slice(0, -1);
  const styleField = useFormFieldState('StyleGridField', stylePath);
  const style: NodeStyle = styleField.getValue() ?? {};
  return (
    <Form.Field path={jsonPath} label={label} readonly={readonly}>
      <StyleGrid
        hue={getValue()}
        tone={style.tone}
        indeterminate={indeterminate}
        readonly={!!readonly}
        onValueChange={({ hue, tone }) => {
          // A pick is a commit: the grid never blurs, so it commits itself.
          styleField.onValueChange(NodeStyle.ast, { ...style, hue, tone });
          onBlur();
        }}
      />
    </Form.Field>
  );
};

/** The outline row alone: a line takes a hue but no fill, so its colour is the hue's border. */
const LINE_TONES: readonly NodeTone[] = [0];

/** A line's colour, rendered at `line.hue`: the style grid's outline row, which writes just the hue. */
export const LineHueField: FormFieldRenderer = ({
  type,
  label,
  jsonPath,
  readonly,
  indeterminate,
  getValue,
  onValueChange,
  onBlur,
}) => (
  <Form.Field path={jsonPath} label={label} readonly={readonly}>
    <StyleGrid
      hue={getValue()}
      tone={0}
      tones={LINE_TONES}
      indeterminate={indeterminate}
      readonly={!!readonly}
      onValueChange={({ hue }) => {
        onValueChange(type, hue);
        onBlur();
      }}
    />
  </Form.Field>
);
