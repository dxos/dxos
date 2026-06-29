//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Ref, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Game, GameCapabilities } from '#types';

export type GameArticleProps = AppSurface.ObjectArticleProps<Game>;

export const GameArticle = ({ role, attendableId, subject: game }: GameArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const variants = useCapabilities(GameCapabilities.VariantProvider);
  const ref = game.variant as Ref.Ref<Obj.Unknown>;
  // Subscribe via useObject so the article re-renders when the variant ref loads or changes.
  // The snapshot is discarded; we pass the live ref target to variant components so they can
  // subscribe to their own properties via useObject(state, 'prop').
  useObject(ref);
  const variant = ref?.target as Obj.Unknown | undefined;

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
