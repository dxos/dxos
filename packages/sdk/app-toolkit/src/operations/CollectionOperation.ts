//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';

/**
 * Opens a picker over the collections in the object's space; picking one lists the object there, and
 * the collection takes an object with no parent as its own. Defined here so a card, which sits below the
 * plugins, can offer it.
 */
export const OpenAddToCollection = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.openAddToCollection'),
    name: 'Add to collection',
    description: "Open a dialog to pick a collection in the object's space to add the object to.",
    icon: 'ph--folder-plus--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    object: Obj.Unknown.annotate({ description: 'The object to add.' }),
  }),
  output: Schema.Void,
});
