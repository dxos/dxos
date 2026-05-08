//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Organization, Person } from '@dxos/types';

import { meta } from '#meta';

export const PreviewPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Person.Person, Organization.Organization] }),
  Plugin.make,
);

export default PreviewPlugin;
