//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Input, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type RoutineSettingsProps = AppSurface.SpaceArticleProps;

/**
 * Space-level routine settings. Individual routines are now first-class objects (configured in their
 * article + per-object companion), so this page exposes the space-wide kill-switch for trigger
 * execution. Per-trigger local/edge routing is set on each trigger via its `remote` flag.
 */
export const RoutineSettings = ({ space }: RoutineSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [properties, changeProperties] = useObject(space.properties);
  const enabled = !(properties.triggersDisabled ?? false);

  const handleToggle = (value: boolean) => {
    changeProperties((current) => {
      current.triggersDisabled = !value;
    });
  };

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={t('routine-verbose.label')} description={t('routine.description')}>
            <Form.Row label={t('runtime.label')} description={t('runtime.description')}>
              <Input.Root>
                <Input.Switch checked={enabled} onCheckedChange={handleToggle} />
              </Input.Root>
            </Form.Row>
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

RoutineSettings.displayName = 'RoutineSettings';
