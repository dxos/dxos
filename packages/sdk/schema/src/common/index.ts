//
// Copyright 2025 DXOS.org
//

import * as AccessToken_ from './access-token';
import * as Actor_ from './actor';
import * as Contact_ from './contact';
import * as Message_ from './message';
import * as Organization_ from './organization';
import * as PostalAddress_ from './postal-address';
import * as Project_ from './project';
import * as Task_ from './task';
import * as Text_ from './text';

export * from './access-token';
export * from './actor';
export * from './contact';
export * from './message';
export * from './organization';
export * from './postal-address';
export * from './project';
export * from './task';
export * from './text';

// TODO(burdon): Replace instanceof checks.
// TODO(burdon): Remove Type suffix from other type defs (after API changes).

/**
 * Common data types.
 */
// TODO(wittjosiah): Introduce a generic canvas type which stores data using OCIF (https://www.canvasprotocol.org/).
export namespace DataType {
  export const AccessToken = AccessToken_.AccessTokenSchema;
  export type AccessToken = AccessToken_.AccessTokenType;

  export const ActorRoles = Actor_.ActorRoles;
  export const ActorRole = Actor_.ActorRole;
  export type ActorRole = Actor_.ActorRole;
  export const Actor = Actor_.ActorSchema;
  export type Actor = Actor_.ActorSchema;

  export const Contact = Contact_.Contact;
  export type Contact = Contact_.Contact;

  // TODO(burdon): Move from plugin-inbox.
  // export const Event = Event_.EventType;
  // export type Event = Event_.EventType;

  // TODO(burdon): Move DataType.Message from plugin-space.

  export const Message = Message_.Message;
  export type Message = Message_.Message;
  export const MessageV1 = Message_.MessageV1;
  export type MessageV1 = Message_.MessageV1;
  export const MessageV1ToV2 = Message_.MessageV1ToV2;

  export const Organization = Organization_.Organization;
  export type Organization = Organization_.Organization;

  export const PostalAddress = PostalAddress_.PostalAddressSchema;

  export const Project = Project_.Project;
  export type Project = Project_.Project;

  export const Task = Task_.Task;
  export type Task = Task_.Task;

  export const Text = Text_.TextType;
  export type Text = Text_.TextType;

  // TOOD(burdon): Move Thread from plugin-space
}
