//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { getPersonalSpace, getSpacePath, isPersonalSpace, LayoutOperation } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { useClient } from '@dxos/react-client';
import { type Space, SpaceState } from '@dxos/react-client/echo';
import { Button, Input, useFileDownload, useMulticastObservable, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap, Settings } from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';

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

export type SpaceSettingsContainerProps = {
  space: Space;
};

// TODO(wittjosiah): Handle space migrations here?
export const SpaceSettingsContainer = ({ space }: SpaceSettingsContainerProps) => {
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
        Obj.change(space.properties, (obj) => {
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

  const download = useFileDownload();
  const handleBackup = useCallback(async () => {
    const archive = await space.internal.export();
    download(new Blob([archive.contents as Uint8Array<ArrayBuffer>]), archive.filename);
  }, [space, download]);

  const repairs = useCapabilities(SpaceCapabilities.Repair);
  const handleRepair = useCallback(async () => {
    await Promise.all(repairs.map((repair) => repair({ space, isDefault: isPersonalSpace(space) })));
  }, [space, repairs]);

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
        <Settings.Item title={t('backup-space.title')} description={t('backup-space.description')}>
          <Button onClick={handleBackup}>{t('download-backup.label')}</Button>
        </Settings.Item>
        <Settings.Item title={t('repair-space.title')} description={t('repair-space.description')}>
          <Button onClick={handleRepair}>{t('repair-space.label')}</Button>
        </Settings.Item>
      </Settings.Section>
    </Settings.Viewport>
  );
};

SpaceSettingsContainer.displayName = 'SpaceSettingsContainer';
