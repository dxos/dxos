//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { type Identity } from '@dxos/halo';
import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import { DeviceListItem, type DeviceListItemProps } from '@dxos/shell/react';

import { meta } from '#meta';

export type DevicesFormProps = {
  devices: readonly Identity.DeviceInfo[];
  connectionState?: DeviceListItemProps['connectionState'];
  /** The add-device flow; omitted where the host cannot mint invitation URLs. */
  invitation?: ReactNode;
  onLogout?: () => void;
  /** Both identity test actions render only when both are given. */
  onRecover?: () => void;
  onJoinNewIdentity?: () => void;
};

/**
 * The devices settings form: the identity's devices, adding one, and logging out. The list scrolls
 * with the form rather than in a scroll area of its own, which would swallow the wheel.
 */
export const DevicesForm = ({
  devices,
  connectionState,
  invitation,
  onLogout,
  onRecover,
  onJoinNewIdentity,
}: DevicesFormProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet
            label={t('devices-verbose.label', { ns: meta.profile.key })}
            description={t('devices.description', { ns: meta.profile.key })}
          >
            <Form.FieldSet label={t('devices.label', { ns: meta.profile.key })}>
              <Listbox.Root items={devices.map((device) => ({ value: device.key, label: device.label ?? device.key }))}>
                <Listbox.Content scroll={false} aria-label={t('devices.label', { ns: meta.profile.key })}>
                  {devices.map((device) => (
                    <DeviceListItem key={device.key} device={device} connectionState={connectionState} />
                  ))}
                </Listbox.Content>
              </Listbox.Root>
            </Form.FieldSet>
            {invitation && <Form.FieldSet label={t('add-device.label')}>{invitation}</Form.FieldSet>}
          </Form.FieldSet>
          <Form.FieldSet label={t('logout-section.title')}>
            <Form.Field standalone label={t('logout.label')} description={t('logout.description')}>
              <Button.Root variant='destructive' onClick={onLogout} data-testid='devicesContainer.logout'>
                {t('logout.label')}
              </Button.Root>
            </Form.Field>
          </Form.FieldSet>
          {onRecover && onJoinNewIdentity && (
            <Form.FieldSet
              label={t('identity-test-section.title')}
              description={t('identity-test-section.description')}
            >
              <Form.Field
                standalone
                label={t('recover-identity.label')}
                description={t('recover-identity.description')}
              >
                <Button.Root variant='destructive' onClick={onRecover} data-testid='devicesContainer.recover'>
                  {t('recover-identity.label')}
                </Button.Root>
              </Form.Field>
              <Form.Field
                standalone
                label={t('join-new-identity.label')}
                description={t('join-new-identity.description')}
              >
                <Button.Root
                  variant='destructive'
                  onClick={onJoinNewIdentity}
                  data-testid='devicesContainer.joinExisting'
                >
                  {t('join-new-identity.label')}
                </Button.Root>
              </Form.Field>
            </Form.FieldSet>
          )}
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
