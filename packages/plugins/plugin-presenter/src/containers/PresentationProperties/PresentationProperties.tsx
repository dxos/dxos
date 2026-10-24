//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import {
  ColorField,
  Form,
  type FormFieldMap,
  type FormFieldOverride,
  type FormFieldRendererProps,
} from '@dxos/react-ui-form';
import * as Hooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';
import { Presentation, SlideTheme } from '#types';

/** Related settings side by side: the theme and its accent, the two colors, the two fonts. */
const TEMPLATE = `
  <grid cols="2">
    <field name="name"/>
    <field name="accent"/>
    <field name="background"/>
    <field name="foreground"/>
    <field name="font"/>
    <field name="monoFont"/>
  </grid>
`;

const ColorRow = ({
  jsonPath,
  label,
  readonly,
  presentation,
  ...props
}: FormFieldRendererProps<string | undefined>) => (
  <Form.Field path={jsonPath} label={label} readonly={readonly} presentation={presentation}>
    <ColorField jsonPath={jsonPath} label={label} readonly={readonly} presentation={presentation} {...props} />
  </Form.Field>
);

const FIELD_MAP: FormFieldMap = { accent: ColorRow, background: ColorRow, foreground: ColorRow };

export type PresentationPropertiesProps = { presentation: Presentation.Presentation };

/**
 * The deck's theme in the properties companion, as top-level selectors (theme, colors and fonts), rather than a
 * collapsed group in the generic object form.
 */
export const PresentationProperties = ({ presentation }: PresentationPropertiesProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [theme] = useObject(presentation, 'theme');
  const name = SlideTheme.isName(theme?.name) ? theme.name : undefined;

  // Unset, each field shows what the theme supplies rather than the field's description, which reads as a value.
  const fieldOverrides = useMemo<Record<string, FormFieldOverride>>(() => {
    const color = { placeholder: t('theme-color.placeholder') };
    return {
      name: { placeholder: 'default' },
      accent: color,
      background: color,
      foreground: color,
      font: { placeholder: t('default-font.placeholder', { font: SlideTheme.defaultFont(name) }) },
      monoFont: { placeholder: t('default-font.placeholder', { font: SlideTheme.DEFAULT_MONO_FONT }) },
    };
  }, [t, name]);

  const handleSave = useCallback(
    (next: SlideTheme.Settings) =>
      Obj.update(presentation, (presentation) => {
        // Unset keys are dropped, so clearing every selector leaves no theme override behind.
        const settings = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined));
        presentation.theme = Object.keys(settings).length > 0 ? settings : undefined;
      }),
    [presentation],
  );

  return (
    <Form.Root
      schema={SlideTheme.Settings}
      values={theme ?? {}}
      fieldOverrides={fieldOverrides}
      autoSave
      onSave={handleSave}
    >
      <Form.Layout template={TEMPLATE} fieldMap={FIELD_MAP} />
    </Form.Root>
  );
};

PresentationProperties.displayName = 'PresentationProperties';
