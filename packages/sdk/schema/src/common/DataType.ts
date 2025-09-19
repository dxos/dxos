//
// Copyright 2025 DXOS.org
//

import { Obj } from '@dxos/echo';
import { type ObjectId } from '@dxos/echo-schema';

export { AccessToken } from './access-token';
export { Actor, ActorRole, ActorRoles } from './actor';
export { Event } from './event';
export { Collection, QueryCollection } from './collection';
export { Message, ContentBlock as MessageBlock } from './message';
/** @deprecated */
export { MessageV1, MessageV1ToV2 } from './message';
export { Organization, OrganizationStatusOptions } from './organization';
export { PostalAddress } from './postal-address';
export { Person } from './person';
export { Project } from './project';
export { StoredSchema } from '@dxos/echo-schema';
export { Task } from './task';
export { Text } from './text';
export { View } from '../view';
export { Employer, HasConnection, HasRelationship } from './relations';

// TODO(burdon): Move Thread from plugin-thread?

import { Project as ProjectSchema } from './project';
import { Text as TextSchema } from './text';

export const makeText = (content = '', id?: ObjectId) =>
  id ? Obj.make(TextSchema, { content, id }) : Obj.make(TextSchema, { content });

export const makeProject = (props: Partial<Obj.MakeProps<typeof ProjectSchema>> = {}) =>
  Obj.make(ProjectSchema, {
    collections: [],
    ...props,
  });
