//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import * as ObjectCombobox from '@dxos/app-toolkit/ObjectCombobox';
import { Entity, Obj } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type CanvasPropertiesProps, type RenderLists2D } from '@dxos/react-ui-canvas/scene';
import * as UiHooks from '@dxos/react-ui/Hooks';
import { type Element, type ViewId, isLink, isViewNode } from '@dxos/scene';

import { isCanvasDrawing, objectRef, objectUri, parseLinkedViewId } from '#model';

import { canvasViewAspect } from './view-state.ts';

/** A shape opens a scene of this drawing, never one bound from a linked drawing. */
const isLocalScene = (id: ViewId) => !parseLinkedViewId(id);

/**
 * What a canvas adds to its Properties form, in either 2D view: the database a frame's object comes from, the objects
 * it may show, the fields a frame's state locks or hides, and which groups this viewer left open.
 */
export const useCanvasProperties = (canvas: Obj.Unknown, readViews: () => RenderLists2D): CanvasPropertiesProps => {
  const db = Obj.getDatabase(canvas);
  const contextId = Entity.getURI(canvas);
  const { groups } = useViewState(canvasViewAspect, contextId);
  const { update: updateViewState } = useViewStateActions(canvasViewAspect, contextId);
  const onGroupsChange = useCallback(
    (groups: Record<string, boolean>) => updateViewState((state) => ({ ...state, groups })),
    [updateViewState],
  );

  // A frame may show any object listed in the navigator but this drawing itself.
  const { t } = UiHooks.useTranslation();
  const getOptions = useCallback<NonNullable<CanvasPropertiesProps['getOptions']>>(
    (results) =>
      ObjectCombobox.toOptions(results, {
        t,
        filter: (object) => !(Obj.instanceOf(Drawing.Drawing, object) && object.canvas.target === canvas),
      }),
    [canvas, t],
  );

  // A frame holds its own scene or an object, never both: it may take an object only while its own child scene is
  // empty, so linking never hides what was drawn there.
  const overrides = useCallback(
    (elements: readonly Element[]): ReturnType<NonNullable<CanvasPropertiesProps['overrides']>> => {
      const scenes = readViews();
      const locked = elements.some((element) => {
        if (isLink(element) || !isViewNode(element) || objectUri(element) || parseLinkedViewId(element.scene)) {
          return false;
        }
        const child = scenes[element.scene];
        return child !== undefined && Object.keys(child.nodes).length > 0;
      });
      // A frame showing an object opens the object (or a canvas drawing's root), not a scene of this one.
      const linked = elements.some((element) => !isLink(element) && objectUri(element));
      // The role applies only to an object shown as a surface, not to a canvas drawing shown as a scene; an object
      // still loading is offered one, so the field appears as soon as the object is picked.
      const surfaced = elements.some(
        (element) =>
          !isLink(element) && objectUri(element) && isCanvasDrawing(objectRef(element, db)?.target) === false,
      );
      return {
        ...(locked ? { 'link.object': { readonly: true } } : {}),
        ...(linked ? { scene: { hidden: true } } : {}),
        ...(surfaced ? {} : { 'link.role': { hidden: true } }),
      };
    },
    [readViews, db],
  );

  return useMemo(
    () => ({ db, getOptions, overrides, groups, onGroupsChange, sceneFilter: isLocalScene }),
    [db, getOptions, overrides, groups, onGroupsChange],
  );
};
