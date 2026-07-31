//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Organization, Person } from '@dxos/types';

import { meta } from '#meta';

export const PreviewPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.schema([Person.Person, Organization.Organization])),
  Plugin.make,
);

export default PreviewPlugin;
