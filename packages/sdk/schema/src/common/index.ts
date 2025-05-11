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
 * https://schema.org/docs/schemas.html
 */
// TODO(wittjosiah): Introduce a generic canvas type which stores data using OCIF (https://www.canvasprotocol.org/).
export namespace DataType {
  //
  // AccessToken
  //

  export const AccessToken = AccessToken$.AccessToken;
  export type AccessToken = AccessToken$.AccessToken;

  //
  // Actor
  //

  export const ActorRoles = Actor$.ActorRoles;
  export const ActorRole = Actor$.ActorRole;
  export type ActorRole = Actor$.ActorRole;
  export const Actor = Actor$.Actor;
  export type Actor = Actor$.Actor;

  //
  // Contact
  //

  // TODO(burdon): Rename Person.
  export const Contact = Contact$.Contact;
  export type Contact = Contact$.Contact;

  // TODO(burdon): Move from plugin-inbox.
  // https://schema.org/Event
  // export const Event = Event$.EventType;
  // export type Event = Event$.EventType;

  //
  // Message
  //

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
    export const Transcription = Message$.TranscriptContentBlock;
    export type Transcription = Message$.TranscriptContentBlock;
  }

  /** @deprecated */
  export const MessageV1 = Message$.MessageV1;
  /** @deprecated */
  export type MessageV1 = Message$.MessageV1;
  /** @deprecated */
  export const MessageV1ToV2 = Message$.MessageV1ToV2;

  //
  // Organization
  //

  export const Organization = Organization$.Organization;
  export type Organization = Organization$.Organization;
  export const OrganizationStatusOptions = Organization$.OrganizationStatusOptions;

  export const PostalAddress = PostalAddress$.PostalAddress;

  //
  // Project
  //

  export const Project = Project$.Project;
  export type Project = Project$.Project;

  //
  // Task
  //

  export const Task = Task$.Task;
  export type Task = Task$.Task;

  //
  // Text
  //

  export const Text = Text$.Text;
  export type Text = Text$.Text;

  // TOOD(burdon): Move Thread from plugin-space?
}
