//
// Copyright 2026 DXOS.org
//

import { toBinary } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import { type ClientServicesProvider } from '@dxos/client-protocol';
import { PublicKey } from '@dxos/keys';
import { buf, fromPublicKey } from '@dxos/protocols/buf';
import {
  type Identity,
  type RecoverIdentityRequest,
  RecoverIdentityRequest_ExternalSignatureSchema,
  RecoverIdentityRequestSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';

import { HaloProxy } from './halo-proxy.ts';

/**
 * A proxy over a service provider that records the request rather than serving it. The rpc payload
 * codec encodes with `toBinary`, which throws on a message whose `request` oneof was never
 * selected, so each case is checked for encodability alongside its tag.
 */
const recordRecoverIdentity = () => {
  let request: RecoverIdentityRequest | undefined;
  const serviceProvider = {
    rpc: {
      'IdentityService.recoverIdentity': (value: RecoverIdentityRequest) => {
        request = value;
        return Effect.succeed({} as Identity);
      },
    },
  } as unknown as ClientServicesProvider;

  return { halo: new HaloProxy(serviceProvider), sent: () => request };
};

describe('HaloProxy', () => {
  describe('recoverIdentity', () => {
    test('recovery code selects its case', async () => {
      const { halo, sent } = recordRecoverIdentity();
      await halo.recoverIdentity({ recoveryCode: 'ripe pear' });

      const request = sent()!;
      expect(request.request.case).to.equal('recoveryCode');
      expect(toBinary(RecoverIdentityRequestSchema, request).length).to.be.greaterThan(0);
    });

    test('recovery proof selects its case', async () => {
      const { halo, sent } = recordRecoverIdentity();
      await halo.recoverIdentity({ recoveryProof: 'abcd' });

      const request = sent()!;
      expect(request.request.case).to.equal('recoveryProof');
      expect(toBinary(RecoverIdentityRequestSchema, request).length).to.be.greaterThan(0);
    });

    test('token selects its case', async () => {
      const { halo, sent } = recordRecoverIdentity();
      await halo.recoverIdentity({ token: 'efgh' });

      const request = sent()!;
      expect(request.request.case).to.equal('token');
      expect(toBinary(RecoverIdentityRequestSchema, request).length).to.be.greaterThan(0);
    });

    test('external signature carries the assertion', async () => {
      const { halo, sent } = recordRecoverIdentity();
      const external = buf.create(RecoverIdentityRequest_ExternalSignatureSchema, {
        lookupKey: fromPublicKey(PublicKey.random()),
        deviceKey: fromPublicKey(PublicKey.random()),
        controlFeedKey: fromPublicKey(PublicKey.random()),
        signature: new Uint8Array([1, 2, 3]),
      });
      await halo.recoverIdentity({ external });

      const request = sent()!;
      expect(request.request.case).to.equal('external');
      expect(request.request.case === 'external' && request.request.value.signature).to.deep.equal(
        new Uint8Array([1, 2, 3]),
      );
      expect(toBinary(RecoverIdentityRequestSchema, request).length).to.be.greaterThan(0);
    });
  });
});
