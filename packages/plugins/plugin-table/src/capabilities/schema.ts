//
// Copyright 2025 DXOS.org
//

import { Table } from '@dxos/react-ui-table/types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [Table.Table];
