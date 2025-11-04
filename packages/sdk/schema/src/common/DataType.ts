//
// Copyright 2025 DXOS.org
//

export { createDefaultSchema } from './util';

//
// System
// TODO(burdon): Move from DataType namespace?
//

// TODO(burdon): Move out of here (internal only?)
export { StoredSchema } from '@dxos/echo/internal';

export * as Collection from './Collection';
export * as View from './View';
export * as Text from './Text';

//
// Common structs
//

export * as Actor from './Actor';
export * as ContentBlock from './ContentBlock';
export * as Geo from './Geo';

//
// Common object types
//

export * as AccessToken from './AccessToken';
export * as Event from './Event';
export * as Message from './Message';
export * as Organization from './Organization';
export * as Person from './Person';
export * as Project from './Project';
export * as Task from './Task';

//
// Common relation types
//

export * as AnchoredTo from './AnchoredTo';
export * as Employer from './Employer';
export * as HasConnection from './HasConnection';
export * as HasRelationship from './HasRelationship';
export * as HasSubject from './HasSubject';

//
// Deprecated
//

export { MessageV1, MessageV1ToV2 } from './Message';
export { LegacyOrganization } from './Organization';
export { LegacyPerson } from './Person';
