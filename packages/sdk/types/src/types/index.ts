//
// Copyright 2025 DXOS.org
//

import * as Account from './Account.ts';
import * as Actor from './Actor.ts';
import * as AnchoredTo from './AnchoredTo.ts';
import * as Channel from './Channel.ts';
import * as ContentBlock from './ContentBlock.ts';
import * as DraftMessage from './DraftMessage.ts';
import * as Employer from './Employer.ts';
import * as Event from './Event.ts';
import * as File from './File.ts';
import * as Geo from './Geo.ts';
import * as HasConnection from './HasConnection.ts';
import * as HasRelationship from './HasRelationship.ts';
import * as HasSubject from './HasSubject.ts';
import * as Message from './Message.ts';
import * as Milestone from './Milestone.ts';
import * as Organization from './Organization.ts';
import * as Outline from './Outline.ts';
import * as Person from './Person.ts';
import * as Pipeline from './Pipeline.ts';
import * as Provider from './Provider.ts';
import * as Repo from './Repo.ts';
import * as Task from './Task.ts';
import * as TaskSet from './TaskSet.ts';
import * as Thread from './Thread.ts';
import * as Transcript from './Transcript.ts';

/**
 * Common data types.
 * https://schema.org/docs/schemas.html
 */

// TODO(burdon): Use type `make` constructors instead of `Obj.make`.
// TODO(wittjosiah): Introduce a generic canvas type which stores data using OCIF (https://www.canvasprotocol.org/).

export {
  //
  // Common object types
  //
  Account,
  //
  // Common structs
  //
  Actor,
  //
  // Common relation types
  //
  AnchoredTo,
  Channel,
  ContentBlock,
  DraftMessage,
  Employer,
  Event,
  File,
  Geo,
  HasConnection,
  HasRelationship,
  HasSubject,
  Message,
  Milestone,
  Organization,
  Outline,
  Person,
  Pipeline,
  Provider,
  Repo,
  Task,
  TaskSet,
  Thread,
  Transcript,
};

//
// Deprecated
//

// eslint-disable-next-line @dxos/rules/import-as-namespace
export { LegacyOrganization } from './Organization.ts';
// eslint-disable-next-line @dxos/rules/import-as-namespace
export { LegacyPerson } from './Person.ts';
