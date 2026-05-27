//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { getPersonalSpace, getSpacePath, isPersonalSpace, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Relation } from '@dxos/echo';
import { log } from '@dxos/log';
import { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { useClient } from '@dxos/react-client';
import { type Space, SpaceState, useQuery } from '@dxos/react-client/echo';
import {
  Button,
  Dialog,
  DropdownMenu,
  Icon,
  IconButton,
  Input,
  useMulticastObservable,
  useTranslation,
} from '@dxos/react-ui';
import { Form, type FormFieldMap, Settings } from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';
import { ConfirmReset } from '@dxos/shell/react';

import { meta } from '#meta';
import { SpaceOperation } from '#operations';
import { SpaceCapabilities, SpaceForm } from '#types';

const SpaceFormSchema = SpaceForm.pipe(
  Schema.extend(
    Schema.Struct({
      archived: Schema.Boolean.annotations({ title: 'Archive Space' }),
    }),
  ),
);

// TODO(wittjosiah): Handle space migrations here?
export const SpaceSettingsContainer = ({ space }: AppSurface.SpaceArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const client = useClient();
  const archived = useMulticastObservable(space.state) === SpaceState.SPACE_INACTIVE;
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

      if (changed['archived']) {
        if (newValues.archived && !archived) {
          void invokePromise(SpaceOperation.Close, { space });
          const personalSpace = getPersonalSpace(client);
          if (personalSpace) {
            void invokePromise(LayoutOperation.SwitchWorkspace, {
              subject: getSpacePath(personalSpace.id),
            });
          }
        } else if (!newValues.archived && archived) {
          void invokePromise(SpaceOperation.Open, { space });
        }
      }
    },
    [space, client, archived, invokePromise, toggleEdgeReplication],
  );

  const defaultValues = useMemo(
    () => ({
      name: space.properties.name,
      icon: space.properties.icon,
      hue: space.properties.hue,
      edgeReplication,
      archived,
    }),
    [space.properties.name, space.properties.icon, space.properties.hue, edgeReplication, archived],
  );

  const personal = isPersonalSpace(space);

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
              <Settings.Item title={label} description={t('display-name.description')}>
                <Input.TextInput
                  value={getValue()}
                  onChange={handleChange}
                  placeholder={t('display-name-input.placeholder')}
                  classNames='min-w-64'
                />
              </Settings.Item>
            );
          },
      icon: personal
        ? () => null
        : ({ type, label, getValue, onValueChange }) => {
            const handleChange = useCallback((icon: string) => onValueChange(type, icon), [onValueChange, type]);
            const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
            return (
              <Settings.Item title={label} description={t('icon.description')}>
                <IconPicker
                  value={getValue()}
                  onChange={handleChange}
                  onReset={handleReset}
                  classNames='justify-self-end'
                />
              </Settings.Item>
            );
          },
      hue: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((nextHue: string) => onValueChange(type, nextHue), [onValueChange, type]);
        const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
        return (
          <Settings.Item title={label} description={t('hue.description')}>
            <HuePicker value={getValue()} onChange={handleChange} onReset={handleReset} classNames='justify-self-end' />
          </Settings.Item>
        );
      },
      edgeReplication: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((checked: boolean) => onValueChange(type, checked), [onValueChange, type]);
        return (
          <Settings.Item title={label} description={t('edge-replication.description')}>
            <Input.Switch checked={getValue()} onCheckedChange={handleChange} classNames='justify-self-end' />
          </Settings.Item>
        );
      },
      archived: personal
        ? () => null
        : ({ type, label, getValue, onValueChange }) => {
            const handleChange = useCallback(() => onValueChange(type, !getValue()), [onValueChange, type, getValue]);
            return (
              <Settings.Item title={label} description={t('archive-space.description')}>
                <Button variant={getValue() ? 'default' : 'destructive'} onClick={handleChange}>
                  {getValue() ? t('unarchive-space.label') : t('archive-space.label')}
                </Button>
              </Settings.Item>
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
    await Promise.all(repairs.map((repair) => repair({ space, isDefault: isPersonalSpace(space) })));
  }, [space, repairs]);

  const { schemas, objects, relations, feeds } = useSpaceCounts(space);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const handleReset = useCallback(async () => {
    log.info('reset: confirmed in dialog', { spaceId: space.id });
    try {
      await invokePromise(SpaceOperation.Reset, { space });
      log.info('reset: invocation resolved', { spaceId: space.id });
    } catch (err) {
      log.catch(err, { stage: 'reset: invocation rejected', spaceId: space.id });
      throw err;
    }
    setResetConfirmOpen(false);
  }, [space, invokePromise]);
  const handleResetCancel = useCallback(() => setResetConfirmOpen(false), []);

  return (
    <Settings.Viewport>
      <Settings.Section
        title={t('space-properties-settings-verbose.label')}
        description={t('space-properties-settings.description', { ns: meta.id })}
      >
        <Form.Root
          key={space.id}
          fieldMap={fieldMap}
          schema={SpaceFormSchema}
          defaultValues={defaultValues}
          onValuesChanged={handleValuesChanged}
        >
          <Form.FieldSet />
        </Form.Root>
      </Settings.Section>

      <Settings.Section title={t('space-controls.title')} description={t('space-controls.description')}>
        <Settings.Item title={t('space-key.title')} description={t('space-key.description')}>
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
        </Settings.Item>
        <Settings.Item title={t('backup-space.title')} description={t('backup-space.description')}>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button>
                {t('download-backup.label')}
                <Icon icon='ph--caret-down--regular' size={4} classNames='mis-2' />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Viewport>
                <DropdownMenu.Item onClick={handleBackupBinary}>{t('download-backup-binary.label')}</DropdownMenu.Item>
                <DropdownMenu.Item onClick={handleBackupJson}>{t('download-backup-json.label')}</DropdownMenu.Item>
              </DropdownMenu.Viewport>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Settings.Item>
        <Settings.Item title={t('repair-space.title')} description={t('repair-space.description')}>
          <Button onClick={handleRepair}>{t('repair-space.label')}</Button>
        </Settings.Item>
      </Settings.Section>

      <Settings.Section title={t('danger-zone.title')} description={t('danger-zone.description')}>
        <Settings.Item title={t('space-contents.title')} description={t('space-contents.description')}>
          <div className='grid grid-cols-4 gap-2 justify-self-end text-center'>
            <ContentCount label={t('schema-count.label')} value={schemas} />
            <ContentCount label={t('object-count.label')} value={objects} />
            <ContentCount label={t('relation-count.label')} value={relations} />
            <ContentCount label={t('feed-count.label')} value={feeds} />
          </div>
        </Settings.Item>
        <Settings.Item title={t('reset-space.title')} description={t('reset-space.description')}>
          <Dialog.Root open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
            <Dialog.Trigger asChild>
              <Button variant='destructive'>{t('reset-space.label')}</Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay>
                <Dialog.Content>
                  <Dialog.Header>
                    <Dialog.Title>{t('reset-space-confirm.title')}</Dialog.Title>
                  </Dialog.Header>
                  <Dialog.Body>
                    <Dialog.Description classNames='sr-only'>{t('reset-space-confirm.description')}</Dialog.Description>
                    <ConfirmReset
                      active
                      title={t('reset-space-confirm.title')}
                      message={t('reset-space-confirm.description')}
                      confirmLabel={t('reset-space.label')}
                      errorMessage={t('reset-space-failed.message')}
                      onConfirm={handleReset}
                      onCancel={handleResetCancel}
                    />
                  </Dialog.Body>
                </Dialog.Content>
              </Dialog.Overlay>
            </Dialog.Portal>
          </Dialog.Root>
        </Settings.Item>
      </Settings.Section>
    </Settings.Viewport>
  );
};

SpaceSettingsContainer.displayName = 'SpaceSettingsContainer';

const ContentCount = ({ label, value }: { label: string; value: number }) => (
  <div className='flex flex-col items-center'>
    <div className='text-lg font-mono tabular-nums'>{value}</div>
    <div className='text-xs text-description'>{label}</div>
  </div>
);

type SpaceCounts = {
  schemas: number;
  objects: number;
  relations: number;
  feeds: number;
};

const useSpaceCounts = (space: Space): SpaceCounts => {
  const entities = useQuery(space.db, Filter.everything());
  const { objects, relations } = useMemo(() => {
    let objects = 0;
    let relations = 0;
    for (const entity of entities) {
      if (Relation.isRelation(entity)) {
        relations += 1;
      } else {
        objects += 1;
      }
    }
    return { objects, relations };
  }, [entities]);

  const [schemas, setSchemas] = useState(0);
  useEffect(() => {
    const { registry } = space.db.graph;
    setSchemas(registry.types.length);
    return registry.changed.on(() => setSchemas(registry.types.length));
  }, [space]);

  const pipeline = useMulticastObservable(space.pipeline);
  const feeds = (pipeline.controlFeeds?.length ?? 0) + (pipeline.dataFeeds?.length ?? 0);

  return { schemas, objects, relations, feeds };
};
