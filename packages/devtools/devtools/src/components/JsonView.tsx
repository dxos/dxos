//
// Copyright 2023 DXOS.org
//

import { fromBinary } from '@bufbuild/protobuf';
import React, { type FC } from 'react';

import { PublicKey } from '@dxos/keys';
import { bufRegistry } from '@dxos/protocols/buf-registry';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { arrayToBuffer } from '@dxos/util';

export type JsonViewProps = {
  data?: object;
  truncate?: boolean;
  /** Off for a section inside a larger scrolling panel, where a JSONPath input per block is noise. */
  filter?: boolean;
};

/** Highlighted JSON in its own scrolling viewport, with a JSONPath filter unless embedded. */
export const JsonView: FC<JsonViewProps> = ({ data, truncate = true, filter = true }) => (
  <Syntax.Root data={data} replacer={replacer(truncate)}>
    <Syntax.Content>
      {filter && <Syntax.Filter />}
      <Syntax.Viewport>
        <Syntax.Code />
      </Syntax.Viewport>
    </Syntax.Content>
  </Syntax.Root>
);

// TODO(burdon): Factor out.
// TODO(mykola): Add proto schema. Decode bytes.
// TODO(mykola): Write our own recursive replacing, to avoid double serialization.
const replacer =
  (truncate = false) =>
  (key: any, value: any) => {
    // TODO(dmaretskyi): Overly aggressive and breaks lots of other strings.
    // if (typeof value === 'string') {
    //   if (truncate) {
    //     const k = PublicKey.safeFrom(value);
    //     if (k) {
    //       return k.truncate();
    //     }
    //   }
    // }

    if (typeof value === 'object') {
      if (truncate) {
        if (value instanceof PublicKey) {
          return value.truncate();
        }
      }

      if (value instanceof Uint8Array) {
        return arrayToBuffer(value).toString('hex');
      }

      if (value?.type === 'Buffer') {
        return Buffer.from(value.data).toString('hex');
      }

      if (value?.$typeName === 'google.protobuf.Any') {
        try {
          // `typeUrl` may carry a prefix (`type.googleapis.com/example.Message`), which the
          // registry keys do not.
          const desc = bufRegistry.getMessage(value.typeUrl.slice(value.typeUrl.lastIndexOf('/') + 1));
          if (desc) {
            return { '@type': value.typeUrl, ...fromBinary(desc, value.value) };
          }
        } catch {}
      }
    }

    return value;
  };
