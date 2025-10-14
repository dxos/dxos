//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { TypedObject } from '@dxos/echo-schema';

// All section metadata needs to be optional/have defaults.
// Any objects added to the collection will start with the section defaults.
// If an object is removed from the collection without removing the section metadata this is fine.
// Stack components should clean-up the superfluous data on future edits.

export const SectionSchema = Schema.Struct({
  height: Schema.optional(Schema.Number),
  // Space for data that isn't stack-specific but is specific to this view instance.
  //  e.g. cover/fill for an image
  custom: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
});

// TODO(wittjosiah): This needs a relation to be connected to a stack.
export class StackViewType extends TypedObject({
  typename: 'dxos.org/type/StackView',
  version: '0.1.0',
})({
  sections: Schema.mutable(Schema.Record({ key: Schema.String, value: SectionSchema })),
}) {}
