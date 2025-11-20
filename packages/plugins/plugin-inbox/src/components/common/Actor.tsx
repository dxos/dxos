//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Actor } from '@dxos/types';

import { meta } from '../../meta';

export const ActorComponent = ({ actor, classNames }: ThemedClassName<{ actor: Actor.Actor }>) => {
  const { t } = useTranslation(meta.id);

  return (
    <div role='none' className={mx('flex is-full items-center gap-2 overflow-hidden', classNames)}>
      <IconButton
        variant='ghost'
        disabled={!actor.contact}
        icon='ph--user--duotone'
        iconOnly
        size={4}
        label={t('open profile button')}
        classNames='cursor-pointer text-subdued !p-0'
      />
      <div className='truncate text-description'>{actor.name ?? actor.email}</div>
    </div>
  );
};

export const ActorList = ({ classNames, actors }: ThemedClassName<{ actors: Actor.Actor[] }>) => {
  return (
    <div role='none' className={mx('flex flex-col is-full', classNames)}>
      {actors.map((actor, idx) => (
        <ActorComponent key={idx} actor={actor} />
      ))}
    </div>
  );
};
