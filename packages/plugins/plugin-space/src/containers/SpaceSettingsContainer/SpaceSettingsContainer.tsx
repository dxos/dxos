//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';
import { SpacesService } from '@dxos/protocols/rpc';
import { useClient } from '@dxos/react-client';
import { Button, Dialog, DropdownMenu, Flex, Icon, IconButton, Input, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap } from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';

import { meta } from '#meta';
import { SpaceCapabilities, SpaceOperation, SpaceSchema } from '#types';

const SpaceFormSchema = SpaceSchema.SpaceForm;

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

  const isPrivate = space.membershipPolicy === MembershipPolicy.LOCKED;

  const defaultValues = useMemo(
    () => ({
      name: space.properties.name,
      icon: space.properties.icon,
      hue: space.properties.hue,
      private: isPrivate,
      edgeReplication,
    }),
    [space.properties.name, space.properties.icon, space.properties.hue, isPrivate, edgeReplication],
  );

  // The default space is the fallback target for unscoped content, so it cannot be deleted until
  // another space is designated in its place.
  const isDefaultSpace = space.id === AppSpace.getDefaultSpace(client)?.id;

  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      name: ({ type, label, getValue, onValueChange }) => {
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
                classNames='w-64 max-w-full min-w-0'
              />
            </Input.Root>
          </Form.Row>
        );
      },
      icon: ({ type, label, getValue, onValueChange }) => {
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
      // Read-only: the membership policy is written into the genesis credential at creation.
      private: ({ label, getValue }) => (
        <Form.Row label={label} description={t('private.description')}>
          <Input.Root>
            <Input.Switch checked={getValue()} disabled classNames='justify-self-end' />
          </Input.Root>
        </Form.Row>
      ),
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
    [t],
  );

  const handleBackupBinary = useCallback(async () => {
    await invokePromise(SpaceOperation.ExportSpace, { space, format: SpacesService.SpaceArchiveFormat.enums.BINARY });
  }, [space, invokePromise]);
  const handleBackupJson = useCallback(async () => {
    await invokePromise(SpaceOperation.ExportSpace, { space, format: SpacesService.SpaceArchiveFormat.enums.JSON });
  }, [space, invokePromise]);

  const repairs = useCapabilities(SpaceCapabilities.Repair);
  const handleRepair = useCallback(async () => {
    await Promise.all(repairs.map((repair) => repair({ space, isDefault: isDefaultSpace })));
  }, [space, repairs, isDefaultSpace]);

  const handleResetHome = useCallback(() => AppSpace.resetHomeVisibility(space), [space]);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // Wired to an onClick handler: must resolve (never reject) so it can't trigger an unhandled rejection.
  const handleDelete = useCallback(async () => {
    try {
      await invokePromise(SpaceOperation.Delete, { space });
      setDeleteConfirmOpen(false);
      const defaultSpace = AppSpace.getDefaultSpace(client);
      if (defaultSpace) {
        void invokePromise(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(defaultSpace.id) });
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
            <Form.Row label={t('space-id.title')} description={t('space-id.description')}>
              <Flex gap='sm' align='center'>
                <Input.Root>
                  <Input.TextInput value={space.id} disabled classNames='flex-1 font-mono text-xs' />
                </Input.Root>
                <IconButton
                  icon='ph--copy--regular'
                  iconOnly
                  label={t('copy-space-id.label')}
                  onClick={() => {
                    void navigator.clipboard.writeText(space.id);
                  }}
                />
              </Flex>
            </Form.Row>
            <Form.Row label={t('backup-space.title')} description={t('backup-space.description')}>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button>
                    {t('download-backup.label')}
                    <Icon icon='ph--caret-down--regular' size={4} classNames='ms-2' />
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
            <Form.Row label={t('reset-home.title')} description={t('reset-home.description')}>
              <Button onClick={handleResetHome}>{t('reset-home.label')}</Button>
            </Form.Row>
          </Form.Section>

          <Form.Section title={t('danger-zone.title')} description={t('danger-zone.description')}>
            {/* Shown but disabled on the default space: hiding it reads as "this space cannot be
                deleted" rather than "pick a different default space first". */}
            <Form.Row
              label={t('delete-space.title')}
              description={isDefaultSpace ? t('delete-default-space.description') : t('delete-space.description')}
            >
              <Dialog.Root open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <Dialog.Trigger asChild>
                  <Button variant='destructive' disabled={isDefaultSpace} data-testid='spaceSettings.deleteSpace'>
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
                        <Flex gap='sm' justify='end' classNames='mt-4'>
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
                        </Flex>
                      </Dialog.Body>
                    </Dialog.Content>
                  </Dialog.Overlay>
                </Dialog.Portal>
              </Dialog.Root>
            </Form.Row>
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

SpaceSettingsContainer.displayName = 'SpaceSettingsContainer';
