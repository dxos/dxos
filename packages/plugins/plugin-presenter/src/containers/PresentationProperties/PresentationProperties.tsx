//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Form, type FormFieldOverride } from '@dxos/react-ui-form';

import { Presentation, SlideTheme } from '#types';

/** Unset, a select shows nothing rather than its description, which reads as a value. */
const FIELD_OVERRIDES: Record<string, FormFieldOverride> = {
  name: { placeholder: '' },
  font: { placeholder: '' },
  monoFont: { placeholder: '' },
};

export type PresentationPropertiesProps = { presentation: Presentation.Presentation };

/**
 * The deck's theme in the properties companion, as top-level selectors (theme, font, code font and colors), rather than
 * a collapsed group in the generic object form.
 */
export const PresentationProperties = ({ presentation }: PresentationPropertiesProps) => {
  const [theme] = useObject(presentation, 'theme');
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
      fieldOverrides={FIELD_OVERRIDES}
      autoSave
      onSave={handleSave}
    >
      <Form.Fields />
    </Form.Root>
  );
};

PresentationProperties.displayName = 'PresentationProperties';
