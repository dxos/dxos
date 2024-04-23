//
// Copyright 2024 DXOS.org
//

import { S, TypedObject, ref } from '@dxos/echo-schema';

import { Collection } from './collection';

// All section metadata needs to be optional/have defaults.
// Any objects added to the collection will start with the section defaults.
// If an object is removed from the collection without removing the section metadata this is fine.
// Stack component should cleanup the superfluous data on future edits.

export class Section extends S.Class<Section>('dxos.StackView.Section')({
  height: S.optional(S.number),
}) {}

export class StackView extends TypedObject({ typename: 'dxos.StackView', version: '0.1.0' })({
  collection: ref(Collection),
  sections: S.mutable(S.record(S.string, Section)),
}) {}
