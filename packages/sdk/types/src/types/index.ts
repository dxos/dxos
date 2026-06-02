//
// Copyright 2025 DXOS.org
//

import * as AccessToken from './AccessToken';
import * as Account from './Account';
import * as Actor from './Actor';
import * as AnchoredTo from './AnchoredTo';
import * as Channel from './Channel';
import * as ContentBlock from './ContentBlock';
import * as Employer from './Employer';
import * as Event from './Event';
import * as File from './File';
import * as Geo from './Geo';
import * as HasConnection from './HasConnection';
import * as HasRelationship from './HasRelationship';
import * as HasSubject from './HasSubject';
import * as Message from './Message';
import * as NotificationRule from './NotificationRule';
import * as Organization from './Organization';
import * as Person from './Person';
import * as Pipeline from './Pipeline';
import * as Project from './Project';
import * as Provider from './Provider';
import * as Task from './Task';
import * as Thread from './Thread';
import * as Transcript from './Transcript';

/**
 * Common data types.
 * https://schema.org/docs/schemas.html
 */

// TODO(burdon): Use type `make` constructors instead of `Obj.make`.
// TODO(wittjosiah): Introduce a generic canvas type which stores data using OCIF (https://www.canvasprotocol.org/).

export {
  //
  // Common structs
  //
  Actor,
  ContentBlock,
  Geo,
  Provider,

  //
  // Common object types
  //
  AccessToken,
  Account,
  Channel,
  Event,
  File,
  Message,
  NotificationRule,
  Organization,
  Person,
  Pipeline,
  Project,
  Task,
  Thread,
  Transcript,

  //
  // Common relation types
  //
  AnchoredTo,
  Employer,
  HasConnection,
  HasRelationship,
  HasSubject,
};

//
// Deprecated
//

// eslint-disable-next-line @dxos/rules/import-as-namespace
export { LegacyOrganization } from './Organization';
// eslint-disable-next-line @dxos/rules/import-as-namespace
export { LegacyPerson } from './Person';
