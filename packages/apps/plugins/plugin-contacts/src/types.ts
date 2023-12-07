//
// Copyright 2023 DXOS.org
//

import { AddressBook as AddressBookType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { isTypedObject } from '@dxos/react-client/echo';

import { CONTACTS_PLUGIN } from './meta';

const CONTACTS_ACTION = `${CONTACTS_PLUGIN}/action`;
export enum ContactsAction {
  CREATE = `${CONTACTS_ACTION}/create`,
}

export type ContactsPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides;

export const isAddressBook = (data: unknown): data is AddressBookType => {
  return isTypedObject(data) && AddressBookType.schema.typename === data.__typename;
};
