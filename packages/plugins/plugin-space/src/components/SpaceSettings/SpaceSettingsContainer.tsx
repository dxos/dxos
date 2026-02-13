//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type ChangeEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { useClient } from '@dxos/react-client';
import { type Space, SpaceState } from '@dxos/react-client/echo';
import { Button, Input, useFileDownload, useMulticastObservable, useTranslation } from '@dxos/react-ui';
import {
  ControlItem,
  ControlItemInput,
  ControlPage,
  ControlSection,
  Form,
  type FormFieldMap,
} from '@dxos/react-ui-form';
import { Layout } from '@dxos/react-ui-mosaic';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';

import { meta } from '../../meta';
import { SpaceCapabilities, SpaceForm, SpaceOperation } from '../../types';

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
export const SpaceSettingsContainer = forwardRef<HTMLDivElement, SpaceSettingsContainerProps>(
  ({ space }, forwardedRef) => {
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
          Obj.change(space.properties, (p) => {
            if (changed['name'] && newValues.name !== undefined) {
              p.name = newValues.name;
            }
            if (changed['icon']) {
              p.icon = newValues.icon;
            }
            if (changed['hue']) {
              p.hue = newValues.hue;
            }
          });
        }

        if (changed['archived']) {
          if (newValues.archived && !archived) {
            void invokePromise(SpaceOperation.Close, { space });
            void invokePromise(LayoutOperation.SwitchWorkspace, {
              subject: client.spaces.default.id,
            });
          } else if (!newValues.archived && archived) {
            void invokePromise(SpaceOperation.Open, { space });
          }
        }
      },
      [space, client, archived, invokePromise, toggleEdgeReplication],
    );

    const values = useMemo(
      () => ({
        name: space.properties.name,
        icon: space.properties.icon,
        hue: space.properties.hue,
        edgeReplication,
        archived,
      }),
      [space.properties.name, space.properties.icon, space.properties.hue, edgeReplication, archived],
    );

    const fieldMap = useMemo<FormFieldMap>(
      () => ({
        name: ({ type, label, getValue, onValueChange }) => {
          const handleChange = useCallback(
            ({ target: { value } }: ChangeEvent<HTMLInputElement>) => onValueChange(type, value),
            [onValueChange, type],
          );
          return (
            <ControlItemInput title={label} description={t('display name description')}>
              <Input.TextInput
                value={getValue()}
                onChange={handleChange}
                placeholder={t('display name input placeholder')}
                classNames='min-is-64'
              />
            </ControlItemInput>
          );
        },
        icon: ({ type, label, getValue, onValueChange }) => {
          const handleChange = useCallback((icon: string) => onValueChange(type, icon), [onValueChange, type]);
          const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
          return (
            <ControlItem title={label} description={t('icon description')}>
              <IconPicker
                value={getValue()}
                onChange={handleChange}
                onReset={handleReset}
                classNames='justify-self-end'
              />
            </ControlItem>
          );
        },
        hue: ({ type, label, getValue, onValueChange }) => {
          const handleChange = useCallback((nextHue: string) => onValueChange(type, nextHue), [onValueChange, type]);
          const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
          return (
            <ControlItem title={label} description={t('hue description')}>
              <HuePicker
                value={getValue()}
                onChange={handleChange}
                onReset={handleReset}
                classNames='justify-self-end'
              />
            </ControlItem>
          );
        },
        edgeReplication: ({ type, label, getValue, onValueChange }) => {
          const handleChange = useCallback((checked: boolean) => onValueChange(type, checked), [onValueChange, type]);
          return (
            <ControlItemInput title={label} description={t('edge replication description')}>
              <Input.Switch checked={getValue()} onCheckedChange={handleChange} classNames='justify-self-end' />
            </ControlItemInput>
          );
        },
        archived: ({ type, label, getValue, onValueChange }) => {
          const handleChange = useCallback(() => onValueChange(type, !getValue()), [onValueChange, type, getValue]);
          return (
            <ControlItemInput title={label} description={t('archive space description')}>
              <Button
                disabled={space === client.spaces.default}
                variant={getValue() ? 'default' : 'destructive'}
                onClick={handleChange}
              >
                {getValue() ? t('unarchive space label') : t('archive space label')}
              </Button>
            </ControlItemInput>
          );
        },
      }),
      [t, space, client],
    );

    const download = useFileDownload();
    const handleBackup = useCallback(async () => {
      const archive = await space.internal.export();
      download(new Blob([archive.contents as Uint8Array<ArrayBuffer>]), archive.filename);
    }, [space, download]);

    const repairs = useCapabilities(SpaceCapabilities.Repair);
    const handleRepair = useCallback(async () => {
      await Promise.all(repairs.map((repair) => repair({ space, isDefault: client.spaces.default === space })));
    }, [client, space, repairs]);

    return (
      <Layout.Container scrollable ref={forwardedRef}>
        <ControlPage>
          <ControlSection
            title={t('space properties settings verbose label')}
            description={t('space properties settings description', {
              ns: meta.id,
            })}
          >
            <Form.Root
              fieldMap={fieldMap}
              schema={SpaceFormSchema}
              values={values}
              onValuesChanged={handleValuesChanged}
            >
              <Form.FieldSet />
            </Form.Root>
          </ControlSection>

          <ControlSection title={t('space controls title')} description={t('space controls description')}>
            <div role='none' className='container-max-width grid grid-cols-1 md:grid-cols-[1fr_min-content]'>
              <ControlItemInput title={t('backup space title')} description={t('backup space description')}>
                <Button onClick={handleBackup}>{t('download backup label')}</Button>
              </ControlItemInput>
              <ControlItemInput title={t('repair space title')} description={t('repair space description')}>
                <Button onClick={handleRepair}>{t('repair space label')}</Button>
              </ControlItemInput>
            </div>
          </ControlSection>
        </ControlPage>
      </Layout.Container>
    );
  },
);

SpaceSettingsContainer.displayName = 'SpaceSettingsContainer';
