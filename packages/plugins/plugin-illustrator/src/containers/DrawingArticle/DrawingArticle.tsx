//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { EID, URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { useSelection, useSelectionActions, useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { VariantSurface, hasVariantSurface } from '#components';
import { Drawing, IllustratorCapabilities } from '#types';

import { IllustratorNamespace } from '../../namespace.ts';
import { type DrawingCamera, drawingViewAspect } from './view-state.ts';

export type DrawingArticleProps = AppSurface.ObjectArticleProps<Drawing.Drawing> & {
  extrinsic?: boolean;
};

/**
 * Resolves the drawing's canvas and delegates rendering to the variant claiming its schema.
 * Owns the selection model on behalf of every variant: selected scene object ids live in the
 * attention ViewState under the surface's attendable id, so a companion showing related content
 * reads one source regardless of which renderer drew the picture. Owns the camera the same way, keyed by the drawing,
 * so a session following another sees what it sees.
 */
export const DrawingArticle = ({ role, attendableId, subject: drawing, extrinsic }: DrawingArticleProps) => {
  const { t } = UiHooks.useTranslation(IllustratorNamespace.key);
  const variants = Hooks.useCapabilities(IllustratorCapabilities.VariantProvider);
  const ref = drawing.canvas;
  // Subscribe via the snapshot for load/re-render, but hand variants the LIVE object —
  // their store adapters need `Doc.createAccessor`, which rejects snapshots.
  const [snapshot] = useObject(ref);
  const canvas = snapshot ? ref.target : undefined;
  const match = IllustratorCapabilities.variantFor(canvas, variants);

  const selection = useSelection(attendableId, 'multi');
  const { multi, clear } = useSelectionActions(attendableId);
  const handleSelectionChange = useCallback(
    (objectIds: readonly string[]) => (objectIds.length ? multi([...objectIds]) : clear()),
    [multi, clear],
  );

  // Only the article's camera is the drawing's; a section or slide frames the drawing itself.
  const article = role === AppSurface.Article.role;
  const contextId = Obj.getURI(drawing);
  const { camera } = useViewState(drawingViewAspect, contextId);
  const { update: updateView } = useViewStateActions(drawingViewAspect, contextId);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  // A variant reports the camera it was just given back; only a move it made is a change.
  const handleCameraChange = useCallback(
    (next: DrawingCamera) => {
      if (!cameraRef.current || !sameCamera(cameraRef.current, next)) {
        updateView((state) => ({ ...state, camera: next }));
      }
    },
    [updateView],
  );

  // Activation opens what the object depicts, when its `ref` names an ECHO object.
  const { invokePromise } = Hooks.useOperationInvoker();
  const handleActivate = useCallback(
    (objectId: string) => {
      const db = canvas && Obj.getDatabase(canvas);
      const object = canvas && match?.builder.read(canvas).scene.objects.find(({ id }) => id === objectId);
      // Only ECHO refs have an activation; URLs and paths are carried on the object for tooling.
      if (!db || !object?.ref || !EID.isEID(object.ref)) {
        return;
      }
      const ref = object.ref;
      void db
        .makeRef(URI.make(ref))
        .load()
        .then((target) =>
          // A ref may name a relation or type, which have no navigable path.
          Obj.isObject(target)
            ? invokePromise(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(target)] })
            : undefined,
        )
        // The referenced object may be gone or not yet replicated; that is not the drawing's error.
        .catch((error: unknown) => log.warn('activation target did not load', { ref, error }));
    },
    [canvas, match, invokePromise],
  );

  if (!canvas) {
    return null;
  }

  if (!match || !hasVariantSurface(match, 'article', canvas)) {
    return (
      <div className='p-4 text-sm'>
        {t('unsupported-variant.label', { defaultValue: 'Unsupported drawing variant' })}
      </div>
    );
  }

  return (
    <VariantSurface
      variant={match}
      slot='article'
      drawing={drawing}
      canvas={canvas}
      role={role}
      attendableId={attendableId}
      extrinsic={extrinsic}
      selection={selection}
      onSelectionChange={handleSelectionChange}
      camera={article ? camera : undefined}
      onCameraChange={article ? handleCameraChange : undefined}
      onActivate={handleActivate}
    />
  );
};

DrawingArticle.displayName = 'DrawingArticle';

// Renderers convert through floating point, so a camera read back after it was applied differs in the last places.
const sameCamera = (left: DrawingCamera, right: DrawingCamera) =>
  Math.abs(left.x - right.x) < 1e-3 && Math.abs(left.y - right.y) < 1e-3 && Math.abs(left.zoom - right.zoom) < 1e-6;
