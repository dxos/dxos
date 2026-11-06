//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Avatar from '@dxos/react-ui/Avatar';
import type * as Tag from '@dxos/react-ui/Tag';

import { type DecisionActor, githubAvatarUrl } from './decision-model.ts';

/** Colour and icon together, so the decider never reads from colour alone. */
const ACTOR_STYLE: Record<DecisionActor, { icon: string; hue: Tag.TagHue }> = {
  user: { icon: 'ph--user--regular', hue: 'sky' },
  agent: { icon: 'ph--robot--regular', hue: 'violet' },
};

export type ActorAvatarProps = { actor?: DecisionActor; handle?: string; label?: string };

/** A person's GitHub avatar, or an icon for an agent or an unattributed entry. */
export const ActorAvatar = ({ actor, handle, label }: ActorAvatarProps) =>
  actor === 'user' && handle ? (
    <Avatar.Root
      size='sm'
      src={githubAvatarUrl(handle)}
      fallback={handle}
      label={label}
      data-testid='changelog-graph.avatar'
    />
  ) : (
    <Avatar.Root
      size='sm'
      icon={actor ? ACTOR_STYLE[actor].icon : 'ph--question--regular'}
      hue={actor ? Avatar.toAvatarHue(ACTOR_STYLE[actor].hue) : undefined}
      label={label}
    />
  );
