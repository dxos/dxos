//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useSyncExternalStore } from 'react';

import { type DebugPortController, getDebugPortController } from '@dxos/react-client/devtools';
import { Icon, IconButton, Input, useTranslation } from '@dxos/react-ui';
import { Logger, type LogRow } from '@dxos/react-ui-debug';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

/**
 * Scopes the panel to the controller's own entries.
 *
 * A display filter, not `initialFilter`: that one narrows what the process-wide buffer captures,
 * which would starve the main log companion reading the same buffer.
 */
const isDebugPortRow = (row: LogRow): boolean => (row.entry.meta?.F ?? '').includes(CONTROLLER_FILE);

const CONTROLLER_FILE = 'devtools/debug-port-controller';

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

          {/* The settings variant puts the control in a right-hand column; log rows need the full
              width, so this row collapses to a single column. */}
          <Form.Row
            standalone
            label={t('settings.debug-port.log.label')}
            classNames='md:grid-cols-1 md:[grid-template-areas:"header""description""control""validation"]'
          >
            {/* Only the rows: a settings card has no room for the panel's toolbar, levels or filter. */}
            <Logger.Root rowFilter={isDebugPortRow}>
              <Logger.Content classNames='max-bs-52'>
                <Logger.List />
              </Logger.Content>
            </Logger.Root>
          </Form.Row>
        </>
      )}
    </Form.Section>
  );
};

DebugPortSettings.displayName = 'DebugPortSettings';
