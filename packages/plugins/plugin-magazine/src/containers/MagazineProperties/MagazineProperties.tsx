//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { TemplateEditor } from '@dxos/plugin-automation/components';
import { useObject } from '@dxos/react-client/echo';
import { Input, useTranslation } from '@dxos/react-ui';
import { Form, FormFieldLabel } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Magazine } from '#types';

export type MagazinePropertiesProps = AppSurface.ObjectPropertiesProps<Magazine.Magazine>;

/**
 * Editorial-instructions editor. The curation Routine is created lazily on first curation
 * ({@link Magazine.ensureRoutine}); until it exists the create-dialog `topic` seed is edited directly.
 */
export const MagazineProperties = ({ subject }: MagazinePropertiesProps) => {
  const { t } = useTranslation(meta.profile.key);
  const routine = subject.routine?.target;
  const [topic, setTopic] = useObject(subject, 'topic');

  return (
    <Form.Section>
      <FormFieldLabel standalone label={t('topic-instructions.label')} />
      {routine ? (
        <TemplateEditor id={Obj.getURI(routine)} source={routine.instructions} lineNumbers={false} />
      ) : (
        <Input.Root>
          <Input.TextArea
            placeholder={t('topic-instructions.placeholder')}
            rows={6}
            value={topic ?? ''}
            onChange={(event) => setTopic(event.target.value)}
          />
        </Input.Root>
      )}
    </Form.Section>
  );
};
