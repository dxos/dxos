//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useSyncExternalStore } from 'react';

import { type DebugPortController, getDebugPortController } from '@dxos/react-client/devtools';
import { Icon, IconButton, Input, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type DebugPortSettingsProps = {
  /** Injectable for stories/tests; defaults to the page-wide controller. */
  controller?: DebugPortController;
};

/**
 * Start/stop the agent debug port and surface the session id an agent needs.
 *
 * The port evaluates agent-supplied code against the live client, so it is off until this switch is
 * flipped, the session id is regenerated on every activation, and nothing survives a reload.
 */
export const DebugPortSettings = ({ controller = getDebugPortController() }: DebugPortSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const subscribe = useCallback((listener: () => void) => controller.subscribe(listener), [controller]);
  const getStatus = useCallback(() => controller.getStatus(), [controller]);
  const status = useSyncExternalStore(subscribe, getStatus);

  const handleToggle = useCallback(
    (checked: boolean) => (checked ? controller.start() : controller.stop()),
    [controller],
  );

  const handleCopy = useCallback(() => {
    if (status.session) {
      void navigator.clipboard.writeText(status.session);
    }
  }, [status.session]);

  return (
    <Form.Section
      title={t('settings.debug-port.section.label')}
      description={t('settings.debug-port.section.description')}
    >
      <Form.Row label={t('settings.debug-port.label')} description={t('settings.debug-port.description')}>
        <Input.Root>
          <Input.Switch checked={status.running} onCheckedChange={handleToggle} />
        </Input.Root>
      </Form.Row>

      {status.running && (
        <>
          <Form.Row standalone label={t('settings.debug-port.running.label')}>
            <div role='status' className='flex items-center gap-2 text-sm text-warning-text'>
              <Icon icon='ph--broadcast--regular' size={4} />
              <span>{status.origin}</span>
            </div>
          </Form.Row>

          <Form.Row
            standalone
            label={t('settings.debug-port.session.label')}
            description={t('settings.debug-port.session.description')}
          >
            <div className='flex items-center gap-2'>
              <span className='grow truncate font-mono text-sm'>{status.session}</span>
              <IconButton
                icon='ph--copy--regular'
                iconOnly
                label={t('settings.debug-port.copy-session.label')}
                onClick={handleCopy}
              />
            </div>
          </Form.Row>

          <Form.Row standalone label={t('settings.debug-port.log.label')}>
            <pre data-surface='well' className='max-bs-52 overflow-auto rounded p-2 text-xs whitespace-pre-wrap'>
              {status.log.join('\n')}
            </pre>
          </Form.Row>
        </>
      )}
    </Form.Section>
  );
};

DebugPortSettings.displayName = 'DebugPortSettings';
