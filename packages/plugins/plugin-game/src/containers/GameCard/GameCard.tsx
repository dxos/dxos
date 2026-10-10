//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';

import { Game, GameCapabilities } from '#types';

export type GameCardProps = AppSurface.ObjectCardProps<Game.Game>;

export const GameCard = ({ role, subject: game }: GameCardProps) => {
  const variants = Hooks.useCapabilities(GameCapabilities.VariantProvider);
  const [variantRef] = useObject(game, 'variant');
  // Resolved live rather than as a snapshot: variants mutate their state, and a snapshot is frozen.
  const variant = useResolveRef(variantRef);

  if (!variant) {
    return null;
  }

  const variantTypename = Obj.getTypename(variant);
  const match = variants.find((v) => v.id === variantTypename);
  if (!match?.card) {
    return null;
  }

  const Component = match.card;
  return <Component game={game} variant={variant} role={role} />;
};

GameCard.displayName = 'GameCard';
