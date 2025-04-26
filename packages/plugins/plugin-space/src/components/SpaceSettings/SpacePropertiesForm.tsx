//
// Copyright 2024 DXOS.org
//

import { type Schema as S } from 'effect';
import React, { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { log } from '@dxos/log';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { type Space } from '@dxos/react-client/echo';
import { Input, useTranslation } from '@dxos/react-ui';
import { Form, type InputComponent, ControlItem, ControlItemInput } from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';

import { SPACE_PLUGIN } from '../../meta';
import { SpaceForm } from '../../types';

export type SpacePropertiesFormProps = {
  space: Space;
};

export const SpacePropertiesForm = ({ space }: SpacePropertiesFormProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);

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
    (properties: S.Schema.Type<typeof SpaceForm>) => {
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
    },
    [space, toggleEdgeReplication],
  );

  const values = useMemo(
    () => ({
      name: space.properties.name,
      icon: space.properties.icon,
      hue: space.properties.hue,
      edgeReplication,
    }),
    [space.properties.name, space.properties.icon, space.properties.hue, edgeReplication],
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
    }),
    [t],
  );

  return (
    <Form
      schema={SpaceForm}
      values={values}
      autoSave
      onSave={handleSave}
      Custom={customElements}
      classNames='p-0 container-max-width [&_[role="form"]]:grid [&_[role="form"]]:grid-cols-1 md:[&_[role="form"]]:grid-cols-[1fr_min-content] [&_[role="form"]]:gap-4'
    />
  );
};
