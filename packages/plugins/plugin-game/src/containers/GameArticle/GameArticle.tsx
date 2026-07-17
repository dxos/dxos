//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, type Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
// #region DEBUG
import { log } from '@dxos/log';
import { useTranslation } from '@dxos/react-ui';
// #endregion DEBUG

import { meta } from '#meta';
import { type Game, GameCapabilities } from '#types';

export type GameArticleProps = AppSurface.ObjectArticleProps<Game.Game>;

export const GameArticle = ({ role, attendableId, subject: game }: GameArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const variants = useCapabilities(GameCapabilities.VariantProvider);
  const ref = game.variant as Ref.Ref<Obj.Unknown>;
  const [variant] = useObject(ref);
  // #region DEBUG
  log('[DEBUG H2] game article variant', {
    gameId: game.id,
    variantLoaded: Boolean(variant),
    variantTypename: variant ? Obj.getTypename(variant) : undefined,
  });
  // #endregion DEBUG

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
