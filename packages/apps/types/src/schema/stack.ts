//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';

// All section metadata needs to be optional/have defaults.
// Any objects added to the collection will start with the section defaults.
// If an object is removed from the collection without removing the section metadata this is fine.
// Stack component should cleanup the superfluous data on future edits.

export class Section extends S.Class<Section>('dxos.StackView.Section')({
  height: S.optional(S.number),
  // Space for data that isn't stack-specific but is specific to this view instance.
  //  e.g. cover/fill for an image
  custom: S.optional(S.record(S.string, S.any)),
}) {}

export class StackView extends TypedObject({ typename: 'dxos.StackView', version: '0.1.0' })({
  sections: S.mutable(S.record(S.string, Section)),
}) {}
