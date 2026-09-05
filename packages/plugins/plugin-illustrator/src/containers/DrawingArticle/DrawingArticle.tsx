//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { URI } from '@dxos/keys';
import { useTranslation } from '@dxos/react-ui';
import { useSelection, useSelectionActions } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { Drawing, IllustratorCapabilities } from '#types';
import { findVariant } from '#util';

export type DrawingArticleProps = AppSurface.ObjectArticleProps<Drawing.Drawing> & {
  extrinsic?: boolean;
};

/**
 * Resolves the drawing's canvas and delegates rendering to the variant claiming its schema.
 * Owns the selection model on behalf of every variant: selected scene object ids live in the
 * attention ViewState under the surface's attendable id, so a companion showing related content
 * reads one source regardless of which renderer drew the picture.
 */
export const DrawingArticle = ({ role, attendableId, subject: drawing, extrinsic }: DrawingArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const variants = useCapabilities(IllustratorCapabilities.VariantProvider);
  const ref = drawing.canvas;
  // Subscribe via the snapshot for load/re-render, but hand variants the LIVE object —
  // their store adapters need `Doc.createAccessor`, which rejects snapshots.
  const [snapshot] = useObject(ref);
  const canvas = snapshot ? ref.target : undefined;
  const match = canvas ? findVariant(variants, canvas) : undefined;

  const selection = useSelection(attendableId, 'multi');
  const { multi, clear } = useSelectionActions(attendableId);
  const handleSelectionChange = useCallback(
    (objectIds: readonly string[]) => (objectIds.length ? multi([...objectIds]) : clear()),
    [multi, clear],
  );

  // Activation opens what the object depicts, when its `ref` names an ECHO object.
  const { invokePromise } = useOperationInvoker();
  const handleActivate = useCallback(
    (objectId: string) => {
      const db = canvas && Obj.getDatabase(canvas);
      const object = canvas && match?.builder.read(canvas).scene.objects.find(({ id }) => id === objectId);
      if (!db || !object?.ref || !URI.isURI(object.ref)) {
        return;
      }
      void db
        .makeRef(URI.make(object.ref))
        .load()
        .then((target) =>
          // A ref may name a relation or type, which have no navigable path.
          Obj.isObject(target)
            ? invokePromise(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(target)] })
            : undefined,
        );
    },
    [canvas, match, invokePromise],
  );

  if (!canvas) {
    return null;
  }

  if (!match?.article) {
    return (
      <div className='p-4 text-sm'>
        {t('unsupported-variant.label', { defaultValue: 'Unsupported drawing variant' })}
      </div>
    );
  }

  const Component = match.article;
  return (
    <Component
      drawing={drawing}
      canvas={canvas}
      role={role}
      attendableId={attendableId}
      extrinsic={extrinsic}
      selection={selection}
      onSelectionChange={handleSelectionChange}
      onActivate={handleActivate}
    />
  );
};

DrawingArticle.displayName = 'DrawingArticle';
