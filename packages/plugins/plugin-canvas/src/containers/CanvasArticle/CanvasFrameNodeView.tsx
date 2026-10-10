//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Entity, Obj } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { useAttentionAttributes, useAttentionContext } from '@dxos/react-ui-attention';
import { Attention } from '@dxos/react-ui-attention/types';
import { FrameNodeView, type NodeViewProps, SCENE_OVERLAY_ATTRIBUTE, isFrameNode } from '@dxos/react-ui-canvas/scene';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { mx } from '@dxos/ui-theme';

import { type FrameRole, frameRole, isSceneCanvas, objectRef, parseLinkedSceneId } from '#model';

/** The object a frame shows as a surface, or `undefined` when it shows a scene (its own or a canvas drawing's). */
const useSurfaceObject = (node: NodeViewProps['node']): Obj.Unknown | undefined => {
  const object = useResolveRef(objectRef(node));
  const canvas = useResolveRef(Obj.instanceOf(Drawing.Drawing, object) ? object.canvas : undefined);
  // A canvas drawing is a scene, and so is a drawing whose canvas has not loaded yet; the store links it.
  const drawing = Obj.instanceOf(Drawing.Drawing, object) && (canvas === undefined || isSceneCanvas(canvas));
  return !object || drawing || !isFrameNode(node) || parseLinkedSceneId(node.scene) ? undefined : object;
};

/** The canvas's frame: its scene (its own or a linked canvas drawing's), or any other object as a surface. */
export const CanvasFrameNodeView = (props: NodeViewProps) => {
  const { node } = props;
  const object = useSurfaceObject(node);
  if (!object || !isFrameNode(node)) {
    return <FrameNodeView {...props} />;
  }
  return <FrameSurface object={object} role={frameRole(node)} selected={props.selected} active={props.active} />;
};

/** Above a frame showing an object, the control that opens it in the app; a scene frame keeps its own inside. */
export const CanvasFrameToolbar = ({ node, onOpen }: NodeViewProps) => {
  const object = useSurfaceObject(node);
  if (!object || !onOpen) {
    return null;
  }
  return (
    <Toolbar.Root classNames='rounded-sm bg-modal-surface border border-separator' data-testid='frame-toolbar'>
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--arrows-out--regular'
        label='Open object'
        data-testid='frame-open'
        onClick={onOpen}
      />
    </Toolbar.Root>
  );
};

type FrameSurfaceProps = { object: Obj.Unknown; role: FrameRole; selected?: boolean; active?: boolean };

// The object's own scrolling content takes the wheel, rather than the canvas panning under it.
const overlay = { [SCENE_OVERLAY_ATTRIBUTE]: true };

/**
 * An object shown in a frame as its surface of the frame's role. It is attendable as the object, so its own toolbar
 * acts: by focus within it, or by selecting the frame on the canvas, which moves no focus.
 */
const FrameSurface = ({ object, role, selected, active }: FrameSurfaceProps) => {
  const attendableId = Entity.getURI(object);
  const attentionAttributes = useAttentionAttributes(attendableId);
  const { attention } = useAttentionContext('FrameSurface');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!selected || !element || !attention) {
      return;
    }
    // Next frame: the click that selects the frame then focuses the canvas, which attends the drawing instead.
    const frame = requestAnimationFrame(() => Attention.attendElement(attention, element));
    return () => cancelAnimationFrame(frame);
  }, [selected, attention]);

  // A card is sized by its content; a section or article by the frame (`extrinsic`).
  const card = role === 'card';
  const data = card ? { subject: object, attendableId } : { subject: object, attendableId, extrinsic: true };
  return (
    <div
      ref={ref}
      // Inert until the frame is active (clicked), so a press anywhere on an inactive frame selects and moves it.
      className={mx(
        'dx-cover grid overflow-hidden',
        !card && 'grid-rows-[minmax(0,1fr)]',
        !active && 'pointer-events-none',
      )}
      data-testid='frame-surface'
      data-role={role}
      {...overlay}
      {...attentionAttributes}
    >
      {card ? (
        // The frame already frames it, so the card fills the body without a border of its own.
        <Card.Root grid border={false}>
          <Surface.Surface type={AppSurface.CardContent} data={data} limit={1} />
        </Card.Root>
      ) : role === 'section' ? (
        <Surface.Surface type={AppSurface.Section} data={data} limit={1} />
      ) : (
        <Surface.Surface type={AppSurface.Article} data={data} limit={1} />
      )}
    </div>
  );
};
