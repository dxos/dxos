//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';

import { type Game, GameCapabilities } from '#types';

export type GameCardProps = AppSurface.ObjectCardProps<Game.Game>;

export const GameCard = ({ role, subject: game }: GameCardProps) => {
  const variants = useCapabilities(GameCapabilities.VariantProvider);
  const [variant] = useObject(game.variant);

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
