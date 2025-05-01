//
// Copyright 2024 DXOS.org
//

import { pipe, Schema as S } from 'effect';
import React, { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { chain, createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { useClient } from '@dxos/react-client';
import { SpaceState, type Space } from '@dxos/react-client/echo';
import { Button, Input, useMulticastObservable, useTranslation } from '@dxos/react-ui';
import {
  Form,
  type InputComponent,
  ControlItem,
  ControlItemInput,
  ControlSection,
  ControlPage,
} from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';
import { StackItem } from '@dxos/react-ui-stack';

import { SPACE_PLUGIN } from '../../meta';
import { SpaceAction, SpaceForm } from '../../types';

const FormSchema = SpaceForm.pipe(S.extend(S.Struct({ archived: S.Boolean.annotations({ title: 'Archive space' }) })));

export type SpaceSettingsContainerProps = {
  space: Space;
};

// TODO(wittjosiah): Handle space migrations here?
export const SpaceSettingsContainer = ({ space }: SpaceSettingsContainerProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
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

  const handleSave = useCallback(
    (properties: S.Schema.Type<typeof FormSchema>) => {
      void toggleEdgeReplication(properties.edgeReplication);
      if (properties.name !== space.properties.name) {
        space.properties.name = properties.name;
      }
      if (properties.icon !== space.properties.icon) {
        space.properties.icon = properties.icon;
      }
      if (properties.hue !== space.properties.hue) {
        space.properties.hue = properties.hue;
      }
      if (properties.archived && !archived) {
        void dispatch(
          pipe(
            createIntent(SpaceAction.Close, { space }),
            chain(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: client.spaces.default.id }),
          ),
        );
      } else if (!properties.archived && archived) {
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
        const handleChange = useCallback((nextEmoji: string) => onValueChange(type, nextEmoji), [onValueChange, type]);
        const handleEmojiReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
        return (
          <ControlItem title={label} description={t('icon description')}>
            <IconPicker
              value={getValue()}
              onChange={handleChange}
              onReset={handleEmojiReset}
              classNames='justify-self-end'
              iconSize={5}
            />
          </ControlItem>
        );
      },
      hue: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((nextHue: string) => onValueChange(type, nextHue), [onValueChange, type]);
        const handleHueReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
        return (
          <ControlItem title={label} description={t('hue description')}>
            <HuePicker
              value={getValue()}
              onChange={handleChange}
              onReset={handleHueReset}
              classNames='[--hue-preview-size:1.25rem] justify-self-end'
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
            <Button disabled={space === client.spaces.default} onClick={handleChange}>
              {getValue() ? t('unarchive space label') : t('archive space label')}
            </Button>
          </ControlItemInput>
        );
      },
    }),
    [t, space],
  );

  return (
    <StackItem.Content classNames='block overflow-y-auto pli-2'>
      <ControlPage>
        <ControlSection
          title={t('space properties settings verbose label', { ns: SPACE_PLUGIN })}
          description={t('space properties settings description', { ns: SPACE_PLUGIN })}
        >
          <Form
            schema={FormSchema}
            values={values}
            autoSave
            onSave={handleSave}
            Custom={customElements}
            classNames='p-0 container-max-width [&_[role="form"]]:grid [&_[role="form"]]:grid-cols-1 md:[&_[role="form"]]:grid-cols-[1fr_min-content] [&_[role="form"]]:gap-4'
          />
        </ControlSection>
      </ControlPage>
    </StackItem.Content>
  );
};
