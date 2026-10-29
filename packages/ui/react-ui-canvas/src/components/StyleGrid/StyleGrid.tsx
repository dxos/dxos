//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Form, type FormFieldRenderer, useFormFieldState } from '@dxos/react-ui-form';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import { mx } from '@dxos/ui-theme';

import { useSceneLook } from '../../hooks/index.ts';
import {
  CLASSIC_LOOK,
  NodeStyle,
  type NodeTone,
  type SceneLook,
  STYLE_HUES,
  type StyleHue,
  styleVariant,
} from '../../model/index.ts';
import { BORDER_CLASSES, TONES, variantClasses } from '../../utils/index.ts';

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

/** No item background, pressed or hovered: the swatch is the target, and the selection is drawn around it. */
const ITEM_CLASSES = 'min-w-0 px-0 bg-transparent hover:bg-transparent aria-checked:bg-transparent';

export type StyleGridProps = {
  /** The look whose style set's variants the rows show; the enclosing view's by default. */
  look?: SceneLook;
  hue?: string;
  /** Unset is the style set's default variant, as the frame draws it. */
  tone?: NodeTone;
  /** Several nodes disagree: no swatch is selected until one is picked. */
  indeterminate?: boolean;
  readonly?: boolean;
  /** The rows offered; every variant of the style set by default, or one row (e.g. a line's outline colour only). */
  tones?: readonly NodeTone[];
  onValueChange: (choice: StyleChoice) => void;
};

/**
 * Each offered hue in a column and the style set's variants down the rows (a node's tone picks its variant), every
 * swatch drawn with the classes the node itself would take, so a pick is a preview. A hue the grid does not offer, or
 * none, selects nothing.
 */
export const StyleGrid = ({
  look: lookProp,
  hue,
  tone: toneProp,
  indeterminate,
  readonly,
  tones: tonesProp,
  onValueChange,
}: StyleGridProps) => {
  const contextLook = useSceneLook();
  const look = lookProp ?? contextLook;
  const { styleSet } = look;
  const tones = tonesProp ?? TONES.slice(0, styleSet.variants.length);
  // A tone past the set's last variant draws as the last, so it selects that row.
  const tone = Math.min(toneProp ?? styleSet.defaultVariant, styleSet.variants.length - 1);
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
          const variant = styleVariant(styleSet, rowTone);
          const classes = variantClasses(columnHue, variant, look.tone);
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
                aria-label={`${capitalize(columnHue)}, ${variant.name}`}
                className={mx(
                  'size-5 rounded-xs',
                  BORDER_CLASSES[variant.borderWidth].border,
                  variant.borderStyle === 'dashed' && 'border-dashed',
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

/** The outline row alone: a link takes a hue but no fill, so its colour is the hue's border. */
const OUTLINE_TONES: readonly NodeTone[] = [0];

export type StyleFieldOptions = {
  /** Offer the fill rows (tones 1-3) as well as the outline; a link, or a selection with one, has no fill. */
  fills: boolean;
};

/**
 * The properties panel's style picker, rendered at `style.hue`, for every kind of element: with `fills`, one pick
 * sets the hue and its tone together (a node); without, the outline row sets the hue alone (a link, or a
 * selection mixing kinds, which edits only the style they share).
 */
export const createStyleField = ({ fills }: StyleFieldOptions): FormFieldRenderer => {
  const StyleField: FormFieldRenderer = ({ label, jsonPath, readonly, indeterminate, getValue, onBlur }) => {
    // Hue and tone change together, so the pick writes their parent once; two field writes would race.
    const stylePath = (jsonPath ?? 'style.hue').split('.').slice(0, -1);
    const styleField = useFormFieldState('StyleField', stylePath);
    const style: NodeStyle = styleField.getValue() ?? {};
    return (
      <Form.Field path={jsonPath} label={label} readonly={readonly}>
        <StyleGrid
          // A link's colour is its hue's border whatever the set, so its row is the canvas's own outline.
          look={fills ? undefined : CLASSIC_LOOK}
          hue={getValue()}
          tone={fills ? style.tone : 0}
          tones={fills ? undefined : OUTLINE_TONES}
          indeterminate={indeterminate}
          readonly={!!readonly}
          onValueChange={({ hue, tone }) => {
            // A pick is a commit: the grid never blurs, so it commits itself.
            styleField.onValueChange(NodeStyle.ast, fills ? { ...style, hue, tone } : { ...style, hue });
            onBlur();
          }}
        />
      </Form.Field>
    );
  };
  return StyleField;
};

/** The style picker with its fill rows: a node's, or a selection of nodes. */
export const StyleGridField = createStyleField({ fills: true });

/** The style picker's outline row alone: a link's, or a selection with a link in it. */
export const OutlineStyleField = createStyleField({ fills: false });
