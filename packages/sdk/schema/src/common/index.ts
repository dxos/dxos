//
// Copyright 2025 DXOS.org
//

import * as AccessToken$ from './access-token';
import * as Actor$ from './actor';
import * as Event$ from './event';
import * as Message$ from './message';
import * as Organization$ from './organization';
import * as Person$ from './person';
import * as PostalAddress$ from './postal-address';
import * as Project$ from './project';
import * as Task$ from './task';
import * as Text$ from './text';

// TODO(burdon): Remove (fix The inferred type of 'DeleteMessage' cannot be named without a reference.)
export * from './message';
export * from './task';

// TODO(burdon): Replace instanceof checks.
// TODO(burdon): Remove Type suffix from other type defs (after API changes).
// TODO(wittjosiah): Introduce a generic canvas type which stores data using OCIF (https://www.canvasprotocol.org/).

/**
 * Common data types.
 * https://schema.org/docs/schemas.html
 */
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
  // Event
  //

  export const Event = Event$.Event;
  export type Event = Event$.Event;

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
  // TODO(burdon): Remove.
  export const OrganizationStatusOptions = Organization$.OrganizationStatusOptions;

  export const PostalAddress = PostalAddress$.PostalAddress;

  //
  // Person
  //

  export const Person = Person$.Person;
  export type Person = Person$.Person;

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
