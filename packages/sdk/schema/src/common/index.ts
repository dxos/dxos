//
// Copyright 2025 DXOS.org
//

import { Obj } from '@dxos/echo';
import * as EchoSchema$ from '@dxos/echo-schema';

import * as AccessToken$ from './access-token';
import * as Actor$ from './actor';
import * as Collection$ from './collection';
import * as Event$ from './event';
import * as Message$ from './message';
import * as Organization$ from './organization';
import * as Person$ from './person';
import * as PostalAddress$ from './postal-address';
import * as Project$ from './project';
import * as Relations$ from './relations';
import * as Task$ from './task';
import * as Text$ from './text';
import * as View$ from '../view';

// TODO(burdon): Remove (fix The inferred type of 'DeleteMessage' cannot be named without a reference.)
export * from './message';
export * from './relations';
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
  // Collection
  //

  export const Collection = Collection$.Collection;
  export type Collection = Collection$.Collection;
  export const QueryCollection = Collection$.QueryCollection;
  export type QueryCollection = Collection$.QueryCollection;

  //
  // Message
  //

  export const Message = Message$.Message;
  export type Message = Message$.Message;

  export import MessageBlock = Message$.ContentBlock;

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
  // StoredSchema
  //

  export const StoredSchema = EchoSchema$.StoredSchema;
  export type StoredSchema = EchoSchema$.StoredSchema;

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
  export const makeText = (content = '') => Obj.make(Text, { content });

  //
  // View
  //

  export const View = View$.View;
  export type View = View$.View;

  //
  // Relations
  //

  export const Employer = Relations$.Employer;
  export type Employer = Relations$.Employer;

  export const HasConnection = Relations$.HasConnection;
  export type HasConnection = Relations$.HasConnection;

  export const HasRelationship = Relations$.HasRelationship;
  export type HasRelationship = Relations$.HasRelationship;

  // TOOD(burdon): Move Thread from plugin-space?
}

export const DataTypes = [
  // Objects
  DataType.AccessToken,
  DataType.Collection,
  DataType.QueryCollection,
  DataType.Event,
  DataType.Organization,
  DataType.Person,
  DataType.Project,
  DataType.StoredSchema,
  DataType.Task,
  DataType.Text,
  DataType.View,

  // Relations
  DataType.Employer,
  DataType.HasRelationship,
  DataType.HasConnection,
];
