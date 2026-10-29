//
// Copyright 2026 DXOS.org
//

//
// The canvas's own frame: the engine's frame plus an optional `link.object`, a reference to any ECHO object. Unset,
// the frame opens its child scene in this drawing. Set to a canvas drawing, it shows that drawing's root scene,
// which the store binds alongside this one (`store.ts`); set to anything else, it shows the object's surface in
// the chosen `link.role`.
//

import * as Schema from 'effect/Schema';

import { type Database, Obj, Ref } from '@dxos/echo';
import { URI } from '@dxos/keys';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { type NodeBase, type ViewId, ViewNode, viewLinkFields } from '@dxos/react-ui-canvas/headless';

import { Canvas } from '#types';

/** How a frame shows an object that is not a canvas drawing: the object's surface of that role. */
export const VIEW_ROLES = ['card', 'section', 'article'] as const;
export const ViewRole = Schema.Literals(VIEW_ROLES);
export type ViewRole = Schema.Schema.Type<typeof ViewRole>;

/**
 * The engine's frame link with the object it links to first, so the Link section reads Object, Role, then Show
 * contents.
 */
export const CanvasViewLink = Schema.Struct({
  /** An object the frame shows instead of its own child scene. */
  object: Schema.optional(Ref.Ref(Obj.Unknown).annotate({ title: 'Object' })),
  /** The surface a non-drawing object is shown as; unset is a card. */
  role: Schema.optional(ViewRole.annotate({ title: 'Role' })),
  ...viewLinkFields,
}).annotate({ title: 'Link' });
export type CanvasViewLink = Schema.Schema.Type<typeof CanvasViewLink>;

export const CanvasViewNode = Schema.Struct({
  ...ViewNode.fields,
  link: Schema.optional(CanvasViewLink),
});
export type CanvasViewNode = Schema.Schema.Type<typeof CanvasViewNode>;

/** What an unnamed drawing is called where its id would otherwise show (a linked scene's title, the picker). */
export const UNTITLED_DRAWING = 'Untitled drawing';

/** Separates a linked drawing's URI from its scene id; neither a URI nor a scene id contains it. */
const LINK_SEPARATOR = '|';

/** The id a linked drawing's scene takes in this drawing's store, so it never collides with a local one. */
export const linkedViewId = (uri: string, scene: ViewId): ViewId => `${uri}${LINK_SEPARATOR}${scene}`;

/** The drawing and scene a linked scene id names, or none for a local scene. */
export const parseLinkedViewId = (id: ViewId): { uri: string; scene: ViewId } | undefined => {
  const index = id.lastIndexOf(LINK_SEPARATOR);
  return index < 0 ? undefined : { uri: id.slice(0, index), scene: id.slice(index + 1) };
};

/** A frame's `link.object` as stored: a live `Ref`, its encoded form, or nothing. */
const linkedObject = (node: NodeBase): unknown => {
  const link: unknown = Reflect.get(node, 'link');
  return typeof link === 'object' && link !== null ? Reflect.get(link, 'object') : undefined;
};

/** The URI a frame's `link.object` names, whether it is a live `Ref` or its stored (encoded) form. */
export const objectUri = (node: NodeBase): URI.URI | undefined => {
  const object = linkedObject(node);
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
 * A frame's `link.object` as a `Ref` that resolves: made by `db` when given, since a ref fresh from the object picker
 * has no resolver until the store writes it back.
 */
export const objectRef = (node: NodeBase, db?: Database.Database): Ref.Ref<Obj.Unknown> | undefined => {
  const uri = db && objectUri(node);
  if (db && uri) {
    return db.makeRef<Obj.Unknown>(uri);
  }
  const object = linkedObject(node);
  return Ref.isRef(object) ? object : undefined;
};

/** The role a frame shows its object in. */
export const viewRole = (node: NodeBase): ViewRole => {
  const link: unknown = Reflect.get(node, 'link');
  const role: unknown = typeof link === 'object' && link !== null ? Reflect.get(link, 'role') : undefined;
  return Schema.is(ViewRole)(role) ? role : 'card';
};

/** Whether a canvas belongs to this variant, so a drawing over it embeds as a scene rather than a surface. */
export const isSceneCanvas = (canvas: unknown): canvas is Drawing.Canvas =>
  Drawing.isCanvas(canvas) && Canvas.isSceneSchema(canvas.schema);

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
