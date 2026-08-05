//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Game, GameCapabilities } from '#types';

export type GameArticleProps = AppSurface.ObjectArticleProps<Game.Game>;

export const GameArticle = ({ role, attendableId, subject: game }: GameArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const variants = useCapabilities(GameCapabilities.VariantProvider);
  // Resolved live rather than as a snapshot: variants mutate their state, and a snapshot is frozen.
  const variant = useResolveRef(game.variant);

  if (!variant) {
    return null;
  }

  const variantTypename = Obj.getTypename(variant);
  const match = variants.find((v) => v.id === variantTypename);
  if (!match?.article) {
    return (
      <div className='p-4 text-sm'>{t('unsupported-variant.label', { defaultValue: 'Unsupported game variant' })}</div>
    );
  }

  const Component = match.article;
  return <Component game={game} variant={variant} role={role} attendableId={attendableId} />;
};

GameArticle.displayName = 'GameArticle';
