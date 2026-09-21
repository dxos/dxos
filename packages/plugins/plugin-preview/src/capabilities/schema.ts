//
// Copyright 2023 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Organization, Person } from '@dxos/types';

export const Schema = AppCapability.schema([Person.Person, Organization.Organization]);
