//
// Copyright 2025 DXOS.org
//

import * as AccessToken from './AccessToken';
import * as Actor from './Actor';
import * as AnchoredTo from './AnchoredTo';
import * as ContentBlock from './ContentBlock';
import * as Employer from './Employer';
import * as Event from './Event';
import * as Geo from './Geo';
import * as HasConnection from './HasConnection';
import * as HasRelationship from './HasRelationship';
import * as HasSubject from './HasSubject';
import * as Message from './Message';
import * as Organization from './Organization';
import * as Person from './Person';
import * as Project from './Project';
import * as Task from './Task';

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

  //
  // Common object types
  //
  AccessToken,
  Event,
  Message,
  Organization,
  Person,
  Project,
  Task,

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

export { MessageV1, MessageV1ToV2 } from './Message';
export { LegacyOrganization } from './Organization';
export { LegacyPerson } from './Person';
