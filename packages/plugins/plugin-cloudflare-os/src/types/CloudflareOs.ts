//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { Connection } from '@dxos/link';

/** A gadget of the workspace, as of the last sync. */
export const Gadget = Schema.Struct({
  /** The gadget's workpiece id within its workspace. */
  id: Schema.Number,
  title: Schema.String,
  /** Set while the gadget only exists in that chat's proposed changes. */
  chatId: Schema.Number.pipe(Schema.optional),
});

export interface Gadget extends Schema.Schema.Type<typeof Gadget> {}

/**
 * The Cloudflare OS workspace a space is bound to: one per space, created when a connection binds a
 * workspace. Gadgets and chats stay in the workspace; this object names it and lists its gadgets.
 */
export class Workspace extends Type.makeObject<Workspace>(DXN.make('org.dxos.type.cloudflareOs.workspace', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    /** The workspace id on the deployment. */
    workspaceId: Schema.String.pipe(Annotation.FormInputAnnotation.set(false)),
    /** The connection whose account and deployment the workspace lives on. */
    connection: Ref.Ref(Connection.Connection).pipe(Annotation.FormInputAnnotation.set(false)),
    gadgets: Schema.Array(Gadget).pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--cloud--regular', hue: 'orange' }),
    Annotation.UserType.set(),
  ),
) {}

export const instanceOf = (value: unknown): value is Workspace => Obj.instanceOf(Workspace, value);

export const make = (props: Obj.MakeProps<typeof Workspace>): Workspace => Obj.make(Workspace, props);
