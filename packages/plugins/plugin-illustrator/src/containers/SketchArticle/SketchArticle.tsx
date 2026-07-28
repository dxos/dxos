//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, type Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { IllustratorCapabilities, type Sketch } from '#types';

export type SketchArticleProps = AppSurface.ObjectArticleProps<Sketch.Sketch> & {
  extrinsic?: boolean;
};

/** Resolves the sketch's canvas and delegates rendering to the matching variant's article. */
export const SketchArticle = ({ role, attendableId, subject: sketch, extrinsic }: SketchArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const variants = useCapabilities(IllustratorCapabilities.VariantProvider);
  const ref = sketch.canvas as Ref.Ref<Obj.Unknown>;
  const [canvas] = useObject(ref);

  if (!canvas) {
    return null;
  }

  const typename = Obj.getTypename(canvas);
  const match = variants.find((variant) => variant.id === typename);
  if (!match?.article) {
    return (
      <div className='p-4 text-sm'>
        {t('unsupported-variant.label', { defaultValue: 'Unsupported sketch variant' })}
      </div>
    );
  }

  const Component = match.article;
  return <Component sketch={sketch} canvas={canvas} role={role} attendableId={attendableId} extrinsic={extrinsic} />;
};

SketchArticle.displayName = 'SketchArticle';
