//
// Copyright 2025 DXOS.org
//

//
// System
// TODO(burdon): Move.
//

export { StoredSchema } from '@dxos/echo/internal';

export { View } from '../view';
export * as Collection from './collection';
export * as Text from './text';

//
// Common types
//

export * as AccessToken from './access-token';
export { Actor, ActorRole, ActorRoles } from './actor';
export * as Event from './event';
export { Message, ContentBlock as MessageBlock } from './message';
export * as Organization from './organization';
export { PostalAddress } from './postal-address';
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
