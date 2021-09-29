//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import * as protobuf from 'protobufjs';

import { schemaJson } from './defs/gen';
import { convertSchemaToDescriptor, loadSchemaFromDescriptor } from './encoding';

describe('proto utils', () => {
  it('can convert schema to descriptor and back', () => {
    const root = protobuf.Root.fromJSON(schemaJson);

    const descriptor = convertSchemaToDescriptor(root);

    const newSchema = loadSchemaFromDescriptor(descriptor);

    expect(newSchema.lookupType('.dxos.registry.Record')).to.not.be.undefined;
    expect(newSchema.lookupType('.dxos.registry.Record.Type')).to.not.be.undefined;
    expect(newSchema.lookupType('.dxos.registry.Record.Extension')).to.not.be.undefined;
  });
});
