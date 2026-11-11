//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { useSpaceCallback } from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Filter, Obj, Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { type Space, useQuery } from '@dxos/react-client/echo';
import * as Button from '@dxos/react-ui/Button';
import { useTranslation } from '@dxos/react-ui/Theme';

import { useContributions } from '../hooks.ts';
import { Empty, type PanelProps, Section } from './common.tsx';

export type TypesPanelProps = PanelProps & {
  space?: Space;
  subject?: Obj.Unknown;
  onSelect: (subject: Obj.Unknown) => void;
};

/** The plugin's types; each can be created through the plugin's create-object contribution, and its objects selected. */
export const TypesPanel = ({ pluginId, empty, space, subject, onSelect }: TypesPanelProps) => {
  const types = useContributions(pluginId, AppCapabilities.Schema).flatMap(({ value }) => value);
  const entries = useContributions(pluginId, SpaceCapabilities.CreateObjectEntry).map(({ value }) => value);

  if (types.length === 0) {
    return <Empty>{empty}</Empty>;
  }

  return (
    <>
      {types.map((type) => {
        const typename = Type.getTypename(type);
        return (
          <TypeSection
            key={typename}
            type={type}
            entry={entries.find((entry) => entry.id === typename)}
            space={space}
            subject={subject}
            onSelect={onSelect}
          />
        );
      })}
    </>
  );
};

type TypeSectionProps = Pick<TypesPanelProps, 'space' | 'subject' | 'onSelect'> & {
  type: Type.AnyEntity;
  entry?: SpaceCapabilities.CreateObjectEntry;
};

const TypeSection = ({ type, entry, space, subject, onSelect }: TypeSectionProps) => {
  const { t } = useTranslation();
  const typename = Type.getTypename(type);
  const objects = useQuery(space?.db, Filter.type(type)).filter(Obj.isObject);
  const [error, setError] = useState<string>();
  const create = useSpaceCallback(space?.id, [], (entry: SpaceCapabilities.CreateObjectEntry, space: Space) =>
    entry.createObject({}, { db: space.db }),
  );

  const handleCreate = () => {
    if (entry && space) {
      setError(undefined);
      create(entry, space).catch((error) => setError(String(error)));
    }
  };

  return (
    <Section title={<span className='font-mono'>{typename}</span>}>
      {entry ? (
        <Button.Root label='Create' icon='ph--plus--regular' disabled={!space} onClick={handleCreate} />
      ) : (
        <p className='text-sm text-description'>No create-object contribution for this type.</p>
      )}
      {error && <p className='text-sm text-error-text'>{error}</p>}
      <ul className='flex flex-col'>
        {objects.map((object) => (
          <li key={object.id}>
            <button
              className={`text-sm text-start w-full px-1 rounded-sm ${object === subject ? 'bg-active-surface' : ''}`}
              onClick={() => onSelect(object)}
            >
              {Obj.getLabel(object) ?? t('object-name.placeholder', { ns: typename, defaultValue: object.id })}
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
};
