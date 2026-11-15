//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { DEFAULT_TEXT_TONE, TEXT_COLORS } from '@dxos/react-ui-canvas';
import { Form, type FormFieldRenderer, useFormFieldState } from '@dxos/react-ui-form';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import { NodeStyle, STYLE_HUES, type StyleHue, TEXT_TONES, type TextTone } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

export type TextColorChoice = { hue: StyleHue; tone: TextTone };

const SEPARATOR = ':';

const choiceKey = ({ hue, tone }: TextColorChoice) => `${hue}${SEPARATOR}${tone}`;

const parseChoice = (key: string): TextColorChoice | undefined => {
  const [hue, tone] = key.split(SEPARATOR);
  const styleHue = STYLE_HUES.find((candidate) => candidate === hue);
  const textTone = TEXT_TONES.find((candidate) => String(candidate) === tone);
  return styleHue !== undefined && textTone !== undefined ? { hue: styleHue, tone: textTone } : undefined;
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** What each row of the grid is called, light to dark. */
const TONE_NAMES: Record<TextTone, string> = { 1: 'light', 2: 'medium', 3: 'dark' };

/** No item background, pressed or hovered: the swatch is the target, and the selection is drawn around it. */
const ITEM_CLASSES = 'min-w-0 px-0 bg-transparent hover:bg-transparent aria-checked:bg-transparent';

export type TextColorGridProps = {
  hue?: StyleHue;
  /** Unset, the middle tone, which is what a hue alone draws at. */
  tone?: TextTone;
  /** Several nodes disagree: no swatch is selected until one is picked. */
  indeterminate?: boolean;
  readonly?: boolean;
  /** A pick, or none when the selected swatch is pressed again: the text goes back to its shape's own colour. */
  onValueChange: (choice: TextColorChoice | undefined) => void;
};

/**
 * A text's colour: each style hue in a column, at three tones down the rows, every swatch the colour the text takes.
 * The columns are the style grid's, so the two line up where one sits over the other.
 */
export const TextColorGrid = ({ hue, tone, indeterminate, readonly, onValueChange }: TextColorGridProps) => {
  const selected = indeterminate || !hue ? '' : choiceKey({ hue, tone: tone ?? DEFAULT_TEXT_TONE });
  return (
    <ToggleGroup.Root
      type='single'
      classNames='grid grid-cols-9 gap-1'
      value={selected}
      aria-label='Text colour'
      data-testid='text-color-grid'
      onValueChange={(next) => onValueChange(parseChoice(next))}
    >
      {TEXT_TONES.flatMap((rowTone) =>
        STYLE_HUES.map((columnHue) => {
          const key = choiceKey({ hue: columnHue, tone: rowTone });
          return (
            <ToggleGroup.Item
              key={key}
              value={key}
              variant='ghost'
              classNames={ITEM_CLASSES}
              disabled={readonly}
              data-text-color-option={key}
            >
              <span
                role='img'
                aria-label={`${capitalize(columnHue)}, ${TONE_NAMES[rowTone]}`}
                className={mx(
                  'size-5 rounded-xs',
                  TEXT_COLORS[columnHue][rowTone - 1].swatch,
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

/** A style with a text colour picked, or with none: no pick drops both the hue and its tone. */
export const applyTextColor = <S extends { textHue?: StyleHue; textTone?: TextTone }>(
  style: S,
  choice: TextColorChoice | undefined,
): S => {
  return choice
    ? { ...style, textHue: choice.hue, textTone: choice.tone }
    : { ...style, textHue: undefined, textTone: undefined };
};

/**
 * The properties panel's text colour picker, rendered at `style.textHue`. The hue and its tone change together, so a
 * pick writes their parent once; two field writes would race.
 */
export const TextColorField: FormFieldRenderer = ({ label, jsonPath, readonly, indeterminate, onBlur }) => {
  const stylePath = (jsonPath ?? 'style.textHue').split('.').slice(0, -1);
  const styleField = useFormFieldState('TextColorField', stylePath);
  const style: NodeStyle = styleField.getValue() ?? {};
  return (
    <Form.Field path={jsonPath} label={label} readonly={readonly}>
      <TextColorGrid
        hue={style.textHue}
        tone={style.textTone}
        indeterminate={indeterminate}
        readonly={!!readonly}
        onValueChange={(choice) => {
          // A pick is a commit: the grid never blurs, so it commits itself.
          styleField.onValueChange(NodeStyle.ast, applyTextColor(style, choice));
          onBlur();
        }}
      />
    </Form.Field>
  );
};
