//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useSyncExternalStore } from 'react';

import { type DebugPortController, getDebugPortController } from '@dxos/react-client/devtools';
import { Logger, type LogRow } from '@dxos/react-ui-debug';
import { Form } from '@dxos/react-ui-form';
import * as Field from '@dxos/react-ui/Field';
import * as Flex from '@dxos/react-ui/Flex';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Switch from '@dxos/react-ui/Switch';
import * as SystemButton from '@dxos/react-ui/SystemButton';

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
  /** The switch starts arbitrary eval, so it follows the form's readonly state like every other control. */
  disabled?: boolean;
};

/**
 * Start/stop the agent debug port and surface the session id an agent needs.
 *
 * The port evaluates agent-supplied code against the live client, so it is off until this switch is
 * flipped, the session id is regenerated on every activation, and nothing survives a reload.
 */
export const DebugPortSettings = ({ controller = getDebugPortController(), disabled }: DebugPortSettingsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const subscribe = useCallback((listener: () => void) => controller.subscribe(listener), [controller]);
  const getStatus = useCallback(() => controller.getStatus(), [controller]);
  const status = useSyncExternalStore(subscribe, getStatus);

  // `persist` keeps the session across reloads of this tab: an OAuth redirect or a HMR reload would
  // otherwise strand the agent mid-investigation with a dead session id.
  const handleToggle = useCallback(
    (checked: boolean) => (checked ? controller.start({ persist: true }) : controller.stop()),
    [controller],
  );

  return (
    <Form.FieldSet
      label={t('settings.debug-port.section.label')}
      description={t('settings.debug-port.section.description')}
    >
      <Form.Field standalone label={t('settings.debug-port.label')} description={t('settings.debug-port.description')}>
        <Flex.Flex gap='md' align='center'>
          {status.running && (
            <span className='text-sm text-fg-muted'>
              {t('settings.debug-port.running.label')} <span className='font-mono'>{status.origin}</span>
            </span>
          )}
          <Field.Root>
            <Switch.Switch
              checked={status.running}
              disabled={disabled}
              onCheckedChange={({ checked }) => handleToggle(checked)}
            />
          </Field.Root>
        </Flex.Flex>
      </Form.Field>

      {status.running && (
        <>
          <Form.Field
            standalone
            label={t('settings.debug-port.session.label')}
            description={t('settings.debug-port.session.description')}
          >
            <Flex.Flex gap='sm' align='center'>
              <span className='grow truncate font-mono text-sm'>{status.session}</span>
              <SystemButton.Clipboard
                iconOnly
                label={t('settings.debug-port.copy-session.label')}
                value={status.session ?? ''}
              />
            </Flex.Flex>
          </Form.Field>

          <Form.Field standalone label={t('settings.debug-port.log.label')}>
            {/* Only the rows: a settings card has no room for the panel's toolbar, levels or filter, so nothing to check rows for. */}
            <Logger.Root rowFilter={isDebugPortRow}>
              <Logger.Content classNames='max-h-[16lh]'>
                <Logger.List checkable={false} />
              </Logger.Content>
            </Logger.Root>
          </Form.Field>
        </>
      )}
    </Form.FieldSet>
  );
};

DebugPortSettings.displayName = 'DebugPortSettings';
