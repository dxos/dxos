//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Drawing, IllustratorCapabilities } from '#types';
import { findVariant } from '#util';

export type DrawingArticleProps = AppSurface.ObjectArticleProps<Drawing.Drawing> & {
  extrinsic?: boolean;
};

/** Resolves the drawing's canvas and delegates rendering to the variant claiming its schema. */
export const DrawingArticle = ({ role, attendableId, subject: drawing, extrinsic }: DrawingArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const variants = useCapabilities(IllustratorCapabilities.VariantProvider);
  const ref = drawing.canvas;
  // Subscribe via the snapshot for load/re-render, but hand variants the LIVE object —
  // their store adapters need `Doc.createAccessor`, which rejects snapshots.
  const [snapshot] = useObject(ref);
  const canvas = snapshot ? ref.target : undefined;

  if (!canvas) {
    return null;
  }

  const match = findVariant(variants, canvas);
  if (!match?.article) {
    return (
      <div className='p-4 text-sm'>
        {t('unsupported-variant.label', { defaultValue: 'Unsupported drawing variant' })}
      </div>
    );
  }

  const Component = match.article;
  return <Component drawing={drawing} canvas={canvas} role={role} attendableId={attendableId} extrinsic={extrinsic} />;
};

DrawingArticle.displayName = 'DrawingArticle';
