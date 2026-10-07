//
// Copyright 2023 DXOS.org
//

import { Organization, Person } from '@dxos/types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [Person.Person, Organization.Organization];
