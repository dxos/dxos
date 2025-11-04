//
// Copyright 2025 DXOS.org
//

//
// System
// TODO(burdon): Move from DataType namespace?
//

export { StoredSchema } from '@dxos/echo/internal';

export { View } from '../view';
export * as Collection from './collection';
export * as Text from './text';

//
// Common structs
//

export { Actor, ActorRole, ActorRoles } from './actor';
export { PostalAddress } from './postal-address';

//
// Common object and relation types
//

// TODO(burdon): Message.Message
export { Message, ContentBlock as MessageBlock } from './message';

export * as AccessToken from './access-token';
export * as Event from './event';
export * as Organization from './organization';
export * as Person from './person';
export * as Project from './project';
export * as Task from './task';
export * as AnchoredTo from './relations';
export * as Employer from './relations';
export * as HasConnection from './relations';
export * as HasRelationship from './relations';
export * as HasSubject from './relations';

//
// Deprecated
//

export { MessageV1, MessageV1ToV2 } from './message';
export { LegacyOrganization } from './organization';
export { LegacyPerson } from './person';
