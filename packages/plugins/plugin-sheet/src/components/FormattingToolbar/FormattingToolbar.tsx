//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as ColorPicker from '@dxos/react-ui/ColorPicker';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { meta } from '#meta';
import { SheetRange } from '#types';

import { ALIGN_ICONS, type Formatting, STYLE_ICONS } from './formatting.ts';

/** A highlight's tones: light enough to read text over, dark enough to show on the grid, in either theme. */
const HIGHLIGHT_TONES = [300, 400, 500, 600, 700, 800, 900];

export type FormattingToolbarProps = {
  formatting: Formatting;
  /** Sets a key's values on the cells the toolbar formats (none clears it). */
  onChange: (key: string, values: string[]) => void;
  disabled?: boolean;
  /** Prefixes each control's test id as `<testId>.<key>.<value>`. */
  testId?: string;
};

/**
 * The formatting sections, shared by the sheet's toolbar and each formatted range: alignment, then the styles and the
 * highlight color. Renders inside a `Toolbar.Root`.
 */
export const FormattingToolbar = ({ formatting, onChange, disabled, testId }: FormattingToolbarProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const id = (key: string, value: string) => testId && `${testId}.${key}.${value}`;
  return (
    <>
      <Toolbar.ToggleGroup
        type='single'
        disabled={disabled}
        aria-label={t('align.label')}
        value={formatting.align ?? ''}
        onValueChange={(value) => onChange(SheetRange.alignKey, value ? [value] : [])}
      >
        {Object.entries(ALIGN_ICONS).map(([value, icon]) => (
          <ToggleGroup.Item
            key={value}
            value={value}
            icon={icon}
            label={t(`range-value.${value}.label`)}
            iconOnly
            data-testid={id(SheetRange.alignKey, value)}
          />
        ))}
      </Toolbar.ToggleGroup>
      <Toolbar.Separator />
      <Toolbar.ToggleGroup
        type='multiple'
        disabled={disabled}
        value={formatting.styles}
        onValueChange={(values) => onChange(SheetRange.styleKey, values)}
      >
        {Object.entries(STYLE_ICONS).map(([value, icon]) => (
          <ToggleGroup.Item
            key={value}
            value={value}
            icon={icon}
            label={t(`range-value.${value}.label`)}
            iconOnly
            data-testid={id(SheetRange.styleKey, value)}
          />
        ))}
      </Toolbar.ToggleGroup>
      <ColorPicker.Root
        value={formatting.highlight}
        disabled={disabled}
        onValueChange={(color) => onChange(SheetRange.highlightKey, color && SheetRange.isColor(color) ? [color] : [])}
      >
        <ColorPicker.Trigger label={t('range-value.highlight.label')} tones={HIGHLIGHT_TONES} />
      </ColorPicker.Root>
    </>
  );
};
