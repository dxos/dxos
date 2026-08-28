//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { PublicKey } from '@dxos/keys';
import { bufRegistry } from '@dxos/protocols/buf-registry';
import { decodeCompat } from '@dxos/protocols/buf-shape-compat';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { arrayToBuffer } from '@dxos/util';

// TODO(burdon): Move util to SyntaxHighlighter.
export const JsonView: FC<{ data?: object; truncate?: boolean }> = ({ data, truncate = true }) => {
  return <JsonHighlighter classNames='dx-expander' data={data} replacer={replacer(truncate)} />;
};

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

      if (value?.['@type'] === 'google.protobuf.Any') {
        try {
          // `type_url` may carry a prefix (`type.googleapis.com/example.Message`), which the
          // registry keys do not.
          const desc = bufRegistry.getMessage(value.type_url.slice(value.type_url.lastIndexOf('/') + 1));
          if (desc) {
            // Decoded through the compat layer so a substituted field renders as the shape this
            // viewer formats.
            return {
              '@type': value.type_url,
              ...decodeCompat<Record<string, unknown>>(desc, value.value),
            };
          }
        } catch {}
      }
    }

    return value;
  };
