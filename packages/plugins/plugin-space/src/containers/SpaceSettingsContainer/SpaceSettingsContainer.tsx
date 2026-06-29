//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSpace, Paths, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { useClient } from '@dxos/react-client';
import { Button, Dialog, DropdownMenu, Icon, IconButton, Input, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap } from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';

import { meta } from '#meta';
import { SpaceOperation } from '#operations';
import { SpaceCapabilities, SpaceForm } from '#types';

const SpaceFormSchema = SpaceForm;

// TODO(wittjosiah): Handle space migrations here?
export const SpaceSettingsContainer = ({ space }: AppSurface.SpaceArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const client = useClient();
  const [edgeReplication, setEdgeReplication] = useState(
    space.internal.data.edgeReplication === EdgeReplicationSetting.ENABLED,
  );
  const toggleEdgeReplication = useCallback(
    async (next: boolean) => {
      setEdgeReplication(next);
      await space?.internal
        .setEdgeReplicationPreference(next ? EdgeReplicationSetting.ENABLED : EdgeReplicationSetting.DISABLED)
        .catch((err: unknown) => {
          log.catch(err);
          setEdgeReplication(!next);
        });
    },
    [space],
  );

  const handleValuesChanged = useCallback(
    (newValues: Partial<Schema.Schema.Type<typeof SpaceFormSchema>>, meta: { changed?: Record<string, boolean> }) => {
      const changed = meta.changed ?? {};
      if (changed['edgeReplication']) {
        void toggleEdgeReplication(newValues.edgeReplication ?? false);
      }

      if (changed['name'] || changed['icon'] || changed['hue']) {
        Obj.update(space.properties, (obj) => {
          if (changed['name'] && newValues.name !== undefined) {
            obj.name = newValues.name;
          }
          if (changed['icon']) {
            obj.icon = newValues.icon;
          }
          if (changed['hue']) {
            obj.hue = newValues.hue;
          }
        });
      }
    },
    [space, toggleEdgeReplication],
  );

  const defaultValues = useMemo(
    () => ({
      name: space.properties.name,
      icon: space.properties.icon,
      hue: space.properties.hue,
      edgeReplication,
    }),
    [space.properties.name, space.properties.icon, space.properties.hue, edgeReplication],
  );

  const personal = AppSpace.isPersonalSpace(space);

  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      name: personal
        ? () => null
        : ({ type, label, getValue, onValueChange }) => {
            const handleChange = useCallback(
              ({ target: { value } }: ChangeEvent<HTMLInputElement>) => onValueChange(type, value),
              [onValueChange, type],
            );
            return (
              <Form.Row label={label} description={t('display-name.description')}>
                <Input.Root>
                  <Input.TextInput
                    value={getValue()}
                    onChange={handleChange}
                    placeholder={t('display-name-input.placeholder')}
                    classNames='min-w-64'
                  />
                </Input.Root>
              </Form.Row>
            );
          },
      icon: personal
        ? () => null
        : ({ type, label, getValue, onValueChange }) => {
            const handleChange = useCallback((icon: string) => onValueChange(type, icon), [onValueChange, type]);
            const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
            return (
              <Form.Row label={label} description={t('icon.description')}>
                <IconPicker
                  value={getValue()}
                  onChange={handleChange}
                  onReset={handleReset}
                  classNames='justify-self-end'
                />
              </Form.Row>
            );
          },
      hue: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((nextHue: string) => onValueChange(type, nextHue), [onValueChange, type]);
        const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
        return (
          <Form.Row label={label} description={t('hue.description')}>
            <HuePicker value={getValue()} onChange={handleChange} onReset={handleReset} classNames='justify-self-end' />
          </Form.Row>
        );
      },
      edgeReplication: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((checked: boolean) => onValueChange(type, checked), [onValueChange, type]);
        return (
          <Form.Row label={label} description={t('edge-replication.description')}>
            <Input.Root>
              <Input.Switch checked={getValue()} onCheckedChange={handleChange} classNames='justify-self-end' />
            </Input.Root>
          </Form.Row>
        );
      },
    }),
    [t, space, personal],
  );

  const handleBackupBinary = useCallback(async () => {
    await invokePromise(SpaceOperation.ExportSpace, { space, format: SpaceArchive.Format.BINARY });
  }, [space, invokePromise]);
  const handleBackupJson = useCallback(async () => {
    await invokePromise(SpaceOperation.ExportSpace, { space, format: SpaceArchive.Format.JSON });
  }, [space, invokePromise]);

  const repairs = useCapabilities(SpaceCapabilities.Repair);
  const handleRepair = useCallback(async () => {
    await Promise.all(repairs.map((repair) => repair({ space, isDefault: AppSpace.isPersonalSpace(space) })));
  }, [space, repairs]);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // Wired to an onClick handler: must resolve (never reject) so it can't trigger an unhandled rejection.
  const handleDelete = useCallback(async () => {
    try {
      await invokePromise(SpaceOperation.Delete, { space });
      setDeleteConfirmOpen(false);
      const personalSpace = AppSpace.getPersonalSpace(client);
      if (personalSpace) {
        void invokePromise(LayoutOperation.SwitchWorkspace, { subject: Paths.getSpacePath(personalSpace.id) });
      }
    } catch (err) {
      log.catch(err, { stage: 'delete: invocation rejected', spaceId: space.id });
      setDeleteConfirmOpen(false);
      void invokePromise(LayoutOperation.AddToast, {
        id: `${space.id}-delete-failed`,
        title: t('delete-space-failed.message'),
        icon: 'ph--warning--regular',
      });
    }
  }, [space, client, invokePromise, t]);

  return (
    <Form.Root
      variant='settings'
      key={space.id}
      fieldMap={fieldMap}
      schema={SpaceFormSchema}
      defaultValues={defaultValues}
      onValuesChanged={handleValuesChanged}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section
            title={t('space-properties-settings-verbose.label')}
            description={t('space-properties-settings.description', { ns: meta.profile.key })}
          >
            <Form.FieldSet />
          </Form.Section>

          <Form.Section title={t('space-controls.title')} description={t('space-controls.description')}>
            <Form.Row label={t('space-key.title')} description={t('space-key.description')}>
              <div className='flex items-center gap-2'>
                <Input.Root>
                  <Input.TextInput value={space.key.toHex()} disabled classNames='flex-1 font-mono text-xs' />
                </Input.Root>
                <IconButton
                  icon='ph--copy--regular'
                  iconOnly
                  label={t('copy-space-key.label')}
                  onClick={() => {
                    void navigator.clipboard.writeText(space.key.toHex());
                  }}
                />
              </div>
            </Form.Row>
            <Form.Row label={t('backup-space.title')} description={t('backup-space.description')}>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button>
                    {t('download-backup.label')}
                    <Icon icon='ph--caret-down--regular' size={4} classNames='mis-2' />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Viewport>
                    <DropdownMenu.Item onClick={handleBackupBinary}>
                      {t('download-backup-binary.label')}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onClick={handleBackupJson}>{t('download-backup-json.label')}</DropdownMenu.Item>
                  </DropdownMenu.Viewport>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Form.Row>
            <Form.Row label={t('repair-space.title')} description={t('repair-space.description')}>
              <Button onClick={handleRepair}>{t('repair-space.label')}</Button>
            </Form.Row>
          </Form.Section>

          {!personal && (
            <Form.Section title={t('danger-zone.title')} description={t('danger-zone.description')}>
              <Form.Row label={t('delete-space.title')} description={t('delete-space.description')}>
                <Dialog.Root open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                  <Dialog.Trigger asChild>
                    <Button variant='destructive' data-testid='spaceSettings.deleteSpace'>
                      {t('delete-space.label')}
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay>
                      <Dialog.Content>
                        <Dialog.Header>
                          <Dialog.Title>{t('delete-space-confirm.title')}</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                          <Dialog.Description>{t('delete-space-confirm.description')}</Dialog.Description>
                          <div className='flex justify-end gap-2 mbs-4'>
                            <Dialog.Close asChild>
                              <Button>{t('cancel.label')}</Button>
                            </Dialog.Close>
                            <Button
                              variant='destructive'
                              onClick={handleDelete}
                              data-testid='spaceSettings.deleteSpaceConfirm'
                            >
                              {t('delete-space.label')}
                            </Button>
                          </div>
                        </Dialog.Body>
                      </Dialog.Content>
                    </Dialog.Overlay>
                  </Dialog.Portal>
                </Dialog.Root>
              </Form.Row>
            </Form.Section>
          )}
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

SpaceSettingsContainer.displayName = 'SpaceSettingsContainer';
