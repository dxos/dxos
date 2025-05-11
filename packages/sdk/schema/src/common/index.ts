//
// Copyright 2025 DXOS.org
//

import * as AccessToken$ from './access-token';
import * as Actor$ from './actor';
import * as Contact$ from './contact';
import * as Message$ from './message';
import * as Organization$ from './organization';
import * as PostalAddress$ from './postal-address';
import * as Project$ from './project';
import * as Task$ from './task';
import * as Text$ from './text';

// TODO(burdon): Replace instanceof checks.
// TODO(burdon): Remove Type suffix from other type defs (after API changes).

/**
 * Common data types.
 */
// TODO(wittjosiah): Introduce a generic canvas type which stores data using OCIF (https://www.canvasprotocol.org/).
export namespace DataType {
  // TODO(burdon): Remove (when combinator is changed)
  export const AccessTokenSchema = AccessToken$.AccessTokenSchema;
  export const AccessToken = AccessToken$.AccessTokenType;
  export type AccessToken = AccessToken$.AccessTokenType;

  export const ActorRoles = Actor$.ActorRoles;
  export const ActorRole = Actor$.ActorRole;
  export type ActorRole = Actor$.ActorRole;
  export const Actor = Actor$.ActorSchema;
  export type Actor = Actor$.ActorSchema;

  export const Contact = Contact$.Contact;
  export type Contact = Contact$.Contact;

  // TODO(burdon): Move from plugin-inbox.
  // export const Event = Event$.EventType;
  // export type Event = Event$.EventType;

  // TODO(burdon): Remove (when combinator is changed)
  export const Message = Message$.Message;
  export type Message = Message$.Message;
  export namespace MessageBlock {
    export const Image = Message$.ImageContentBlock;
    export type Image = Message$.ImageContentBlock;
    export const Json = Message$.JsonContentBlock;
    export type Json = Message$.JsonContentBlock;
    export const Reference = Message$.ReferenceContentBlock;
    export type Reference = Message$.ReferenceContentBlock;
    export const Text = Message$.TextContentBlock;
    export type Text = Message$.TextContentBlock;
    export const Transcription = Message$.TranscriptionContentBlock;
    export type Transcription = Message$.TranscriptionContentBlock;
  }
  /** @deprecated */
  export const MessageV1 = Message$.MessageV1;
  /** @deprecated */
  export type MessageV1 = Message$.MessageV1;
  /** @deprecated */
  export const MessageV1ToV2 = Message$.MessageV1ToV2;

  export const Organization = Organization$.Organization;
  export type Organization = Organization$.Organization;
  export const OrganizationStatusOptions = Organization$.OrganizationStatusOptions;

  export const PostalAddress = PostalAddress$.PostalAddressSchema;

  export const Project = Project$.Project;
  export type Project = Project$.Project;

  // TODO(burdon): Remove (when combinator is changed)
  export const TaskSchema = Task$.TaskSchema;
  export const Task = Task$.Task;
  export type Task = Task$.Task;

  export const Text = Text$.TextType;
  export type Text = Text$.TextType;

  // TOOD(burdon): Move Thread from plugin-space
}
