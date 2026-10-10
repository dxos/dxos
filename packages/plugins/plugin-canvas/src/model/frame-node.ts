//
// Copyright 2026 DXOS.org
//

//
// The canvas's own frame: the engine's frame plus an optional `object`, a reference to any ECHO object. Unset,
// the frame opens its child scene in this drawing. Set to a canvas drawing, it shows that drawing's root scene,
// which the store binds alongside this one (`store.ts`); set to anything else, it shows the object's surface in
// the chosen `role`.
//

import * as Schema from 'effect/Schema';

import { type Database, Obj, Ref } from '@dxos/echo';
import { URI } from '@dxos/keys';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { FrameNode, type NodeBase, type SceneId } from '@dxos/react-ui-canvas/scene';

import { Canvas } from '#types';

/** How a frame shows an object that is not a canvas drawing: the object's surface of that role. */
export const FRAME_ROLES = ['card', 'section', 'article'] as const;
export const FrameRole = Schema.Literals(FRAME_ROLES);
export type FrameRole = Schema.Schema.Type<typeof FrameRole>;

export const CanvasFrameNode = Schema.Struct({
  ...FrameNode.fields,
  /** An object the frame shows instead of its own child scene. */
  object: Schema.optional(Ref.Ref(Obj.Unknown).annotate({ title: 'Object' })),
  /** The surface a non-drawing object is shown as; unset is a card. */
  role: Schema.optional(FrameRole.annotate({ title: 'Role' })),
});
export type CanvasFrameNode = Schema.Schema.Type<typeof CanvasFrameNode>;

/** What an unnamed drawing is called where its id would otherwise show (a linked scene's title, the picker). */
export const UNTITLED_DRAWING = 'Untitled drawing';

/** Separates a linked drawing's URI from its scene id; neither a URI nor a scene id contains it. */
const LINK_SEPARATOR = '|';

/** The id a linked drawing's scene takes in this drawing's store, so it never collides with a local one. */
export const linkedSceneId = (uri: string, scene: SceneId): SceneId => `${uri}${LINK_SEPARATOR}${scene}`;

/** The drawing and scene a linked scene id names, or none for a local scene. */
export const parseLinkedSceneId = (id: SceneId): { uri: string; scene: SceneId } | undefined => {
  const index = id.lastIndexOf(LINK_SEPARATOR);
  return index < 0 ? undefined : { uri: id.slice(0, index), scene: id.slice(index + 1) };
};

/** The URI a frame's `object` names, whether it is a live `Ref` or its stored (encoded) form. */
export const objectUri = (node: NodeBase): URI.URI | undefined => {
  const object: unknown = Reflect.get(node, 'object');
  if (Ref.isRef(object)) {
    return object.uri;
  }
  if (typeof object === 'object' && object !== null) {
    const encoded: unknown = Reflect.get(object, '/');
    return URI.isURI(encoded) ? encoded : undefined;
  }
  return undefined;
};

/**
 * A frame's `object` as a `Ref` that resolves: made by `db` when given, since a ref fresh from the object picker
 * has no resolver until the store writes it back.
 */
export const objectRef = (node: NodeBase, db?: Database.Database): Ref.Ref<Obj.Unknown> | undefined => {
  const uri = db && objectUri(node);
  if (db && uri) {
    return db.makeRef<Obj.Unknown>(uri);
  }
  const object: unknown = Reflect.get(node, 'object');
  return Ref.isRef(object) ? object : undefined;
};

/** The role a frame shows its object in. */
export const frameRole = (node: NodeBase): FrameRole => {
  const role: unknown = Reflect.get(node, 'role');
  return Schema.is(FrameRole)(role) ? role : 'card';
};

/** Whether a canvas belongs to this variant, so a drawing over it embeds as a scene rather than a surface. */
export const isSceneCanvas = (canvas: Drawing.Canvas | undefined): boolean => canvas?.schema === Canvas.SCENE_SCHEMA;

/**
 * Whether an object is a drawing of this variant, which a frame embeds as a scene; `undefined` while it is a
 * drawing whose canvas has not loaded.
 */
export const isCanvasDrawing = (object: unknown): boolean | undefined => {
  if (!Obj.instanceOf(Drawing.Drawing, object)) {
    return false;
  }
  const canvas = object.canvas.target;
  return canvas === undefined ? undefined : isSceneCanvas(canvas);
};
