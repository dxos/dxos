//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';
import React, { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { LayoutAction, chain, createIntent } from '@dxos/app-framework';
<<<<<<< HEAD
import { useIntentDispatcher } from '@dxos/app-framework/react';
import { SpaceProperties } from '@dxos/client-protocol';
||||||| 87517e966b
import { useIntentDispatcher } from '@dxos/app-framework/react';
=======
import { useCapabilities, useIntentDispatcher } from '@dxos/app-framework/react';
>>>>>>> main
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
  type FormProps,
  type InputComponent,
} from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';
import { StackItem } from '@dxos/react-ui-stack';

import { SpaceCapabilities } from '../../capabilities';
import { meta } from '../../meta';
import { SpaceAction } from '../../types';

export type SpaceSettingsContainerProps = {
  space: Space;
};

// TODO(wittjosiah): Handle space migrations here?
export const SpaceSettingsContainer = ({ space }: SpaceSettingsContainerProps) => {
  const { t } = useTranslation(meta.id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
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

  const handleSave = useCallback<NonNullable<FormProps<SpaceProperties>['onSave']>>(
    (values) => {
      void toggleEdgeReplication(values.edgeReplication ?? false);
      if (values.name !== space.properties.name) {
        space.properties.name = values.name;
      }
      if (values.icon !== space.properties.icon) {
        space.properties.icon = values.icon;
      }
      if (values.hue !== space.properties.hue) {
        space.properties.hue = values.hue;
      }
      if (values.archived && !archived) {
        void dispatch(
          Function.pipe(
            createIntent(SpaceAction.Close, { space }),
            chain(LayoutAction.SwitchWorkspace, {
              part: 'workspace',
              subject: client.spaces.default.id,
            }),
          ),
        );
      } else if (!values.archived && archived) {
        void dispatch(createIntent(SpaceAction.Open, { space }));
      }
    },
    [space, toggleEdgeReplication, archived],
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

  const customElements: Partial<Record<string, InputComponent>> = useMemo(
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
            <HuePicker value={getValue()} onChange={handleChange} onReset={handleReset} classNames='justify-self-end' />
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
    [t, space],
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
    <StackItem.Content scrollable>
      <ControlPage>
        <ControlSection
          title={t('space properties settings verbose label', { ns: meta.id })}
          description={t('space properties settings description', {
            ns: meta.id,
          })}
        >
          <Form
            autoSave
            outerSpacing={false}
            classNames='container-max-width grid grid-cols-1 md:grid-cols-[1fr_min-content]'
            schema={SpaceProperties}
            values={values}
            onSave={handleSave}
            Custom={customElements}
          />
        </ControlSection>
        <ControlSection
          title={t('space controls title', { ns: meta.id })}
          description={t('space controls description', { ns: meta.id })}
        >
          <div role='none' className='container-max-width grid grid-cols-1 md:grid-cols-[1fr_min-content]'>
            <ControlItemInput
              title={t('backup space title', { ns: meta.id })}
              description={t('backup space description', { ns: meta.id })}
            >
              <Button onClick={handleBackup}>{t('download backup label')}</Button>
            </ControlItemInput>
            <ControlItemInput
              title={t('repair space title', { ns: meta.id })}
              description={t('repair space description', { ns: meta.id })}
            >
              <Button onClick={handleRepair}>{t('repair space label')}</Button>
            </ControlItemInput>
          </div>
        </ControlSection>
      </ControlPage>
    </StackItem.Content>
  );
};
