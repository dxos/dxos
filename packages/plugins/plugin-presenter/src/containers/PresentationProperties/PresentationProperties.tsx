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
import { SlideFooter, SlideTheme } from '@dxos/react-ui-slides';
import * as Hooks from '@dxos/react-ui/Hooks';

import { Presentation } from '#types';

import { PresenterNamespace } from '../../namespace.ts';

/** Related settings side by side: the theme and its accent, the two heading colors, the two colors, the two fonts. */
const TEMPLATE = `
  <grid cols="2">
    <field name="base"/>
    <field name="accent"/>
    <field name="heading"/>
    <field name="subheading"/>
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

const FIELD_MAP: FormFieldMap = {
  accent: ColorRow,
  heading: ColorRow,
  subheading: ColorRow,
  background: ColorRow,
  foreground: ColorRow,
};

/** The counters shown where a part is empty, since the tags' names are what an author has to type. */
const FOOTER_OVERRIDES: Record<string, FormFieldOverride> = {
  right: { placeholder: '<SlideCurrentNo /> / <SlidesTotal />' },
};

export type PresentationPropertiesProps = { presentation: Presentation.Presentation };

/**
 * The deck's theme and footer in the properties companion, as top-level fields (theme, colors and fonts, then the
 * footer's three parts), rather than collapsed groups in the generic object form.
 */
export const PresentationProperties = ({ presentation }: PresentationPropertiesProps) => {
  const { t } = Hooks.useTranslation(PresenterNamespace.key);
  const [theme] = useObject(presentation, 'theme');
  const base = SlideTheme.isName(theme?.base) ? theme.base : undefined;

  // Unset, each field shows what the theme supplies rather than the field's description, which reads as a value.
  const fieldOverrides = useMemo<Record<string, FormFieldOverride>>(() => {
    const color = { placeholder: t('theme-color.placeholder') };
    return {
      base: { placeholder: 'default' },
      accent: color,
      heading: color,
      subheading: color,
      background: color,
      foreground: color,
      font: { placeholder: t('default-font.placeholder', { font: SlideTheme.defaultFont(base) }) },
      monoFont: { placeholder: t('default-font.placeholder', { font: SlideTheme.DEFAULT_MONO_FONT }) },
    };
  }, [t, base]);

  const handleSave = useCallback(
    (next: SlideTheme.Settings) =>
      Obj.update(presentation, (presentation) => {
        // Unset keys are dropped, so clearing every selector leaves no theme override behind.
        const settings = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined));
        presentation.theme = Object.keys(settings).length > 0 ? settings : undefined;
      }),
    [presentation],
  );

  const [footer] = useObject(presentation, 'footer');
  const handleSaveFooter = useCallback(
    (next: SlideFooter.Settings) =>
      Obj.update(presentation, (presentation) => {
        // Empty parts are dropped, so clearing all three leaves no footer behind.
        const settings = Object.fromEntries(Object.entries(next).filter(([, value]) => value?.trim()));
        presentation.footer = Object.keys(settings).length > 0 ? settings : undefined;
      }),
    [presentation],
  );

  return (
    <>
      <Form.Root
        schema={SlideTheme.Settings}
        values={theme ?? {}}
        fieldOverrides={fieldOverrides}
        autoSave
        onSave={handleSave}
      >
        {/* The theme is one sub-object, so its fields sit in one nested group, as the form shows any nested object. */}
        <Form.FieldSet label={t('theme-group.label')} nested collapsible data-testid='presentation.theme'>
          <Form.Layout template={TEMPLATE} fieldMap={FIELD_MAP} />
        </Form.FieldSet>
      </Form.Root>
      <Form.Root
        schema={SlideFooter.Settings}
        values={footer ?? {}}
        fieldOverrides={FOOTER_OVERRIDES}
        autoSave
        onSave={handleSaveFooter}
      >
        <Form.FieldSet label={t('footer-group.label')} nested collapsible data-testid='presentation.footer'>
          <Form.Fields />
        </Form.FieldSet>
      </Form.Root>
    </>
  );
};

PresentationProperties.displayName = 'PresentationProperties';
