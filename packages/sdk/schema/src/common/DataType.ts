//
// Copyright 2025 DXOS.org
//

export { StoredSchema } from '@dxos/echo/internal';

export * as AccessToken from './access-token';
export { Actor, ActorRole, ActorRoles } from './actor';
export * as Event from './event';
export * as Collection from './collection';
export { Message, ContentBlock as MessageBlock } from './message';
/** @deprecated */
export { MessageV1, MessageV1ToV2 } from './message';
export { LegacyOrganization, OrganizationStatusOptions } from './organization';
export * as Organization from './organization';
export { PostalAddress } from './postal-address';
export { LegacyPerson } from './person';
export * as Person from './person';
export * as Project from './project';
export * as Task from './task';
export * as Text from './text';
export { View } from '../view';
export * as AnchoredTo from './relations';
export * as Employer from './relations';
export * as HasConnection from './relations';
export * as HasRelationship from './relations';
export * as HasSubject from './relations';
