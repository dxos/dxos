//
// Copyright 2024 DXOS.org
//

import { TypedObject, S } from '@dxos/echo-schema';

export class AddressBookType extends TypedObject({ typename: 'dxos.org/type/AddressBook', version: '0.1.0' })({}) {}

// Workaround for TS error. You need `S` in scope so TSC can generate types.
// The inferred type of 'AddressBookType' cannot be named without a reference to 'packages/common/util/node_modules/@effect/schema/dist/dts/Schema'. This is likely not portable. A type annotation is necessary.
type _ = S.Schema<any>;
