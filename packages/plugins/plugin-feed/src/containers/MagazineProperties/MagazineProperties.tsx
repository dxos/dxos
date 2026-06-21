//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { TemplateEditor } from '@dxos/plugin-assistant/components';
import { useTranslation } from '@dxos/react-ui';
import { Form, FormFieldLabel } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Magazine } from '#types';

export type MagazinePropertiesProps = AppSurface.ObjectPropertiesProps<Magazine.Magazine>;

export const MagazineProperties = ({ subject }: MagazinePropertiesProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Form.Section>
      <FormFieldLabel standalone label={t('topic-instructions.label')} />
      <TemplateEditor id={Obj.getURI(subject)} source={subject.instructions.source} lineNumbers={false} />
    </Form.Section>
  );
};
