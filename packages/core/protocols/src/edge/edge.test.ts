//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import {
  AdminCreateInvitationCodesRequestSchema,
  EdgeCredentialsHeaderCodec,
  INVITATION_CODE_ALPHABET,
  INVITATION_CODE_LENGTH,
  InvitationCodeSchema,
  RedeemInvitationCodeRequestSchema,
  WS_AUTH_PROTOCOL_PREFIX,
} from './edge.ts';

describe('InvitationCodeSchema', () => {
  test('accepts well-formed codes', () => {
    const decode = Schema.decodeUnknownSync(InvitationCodeSchema);
    expect(decode('AB12CDEF')).toBe('AB12CDEF');
    expect(decode('00000000')).toBe('00000000');
    expect(decode('ZZZZZZZZ')).toBe('ZZZZZZZZ');
  });

  test('accepts vanity codes as typed', () => {
    const decode = Schema.decodeUnknownSync(InvitationCodeSchema);
    expect(decode('SF-MEETUP-7K2Q')).toBe('SF-MEETUP-7K2Q');
    expect(decode('sf-meetup-7k2q')).toBe('sf-meetup-7k2q');
  });

  test('rejects codes that are too short, too long, or contain other characters', () => {
    const decode = Schema.decodeUnknownSync(InvitationCodeSchema);
    expect(() => decode('ABC')).toThrow();
    expect(() => decode('A'.repeat(51))).toThrow();
    expect(() => decode('SF MEETUP')).toThrow();
  });

  test('alphabet has the expected length', () => {
    expect(INVITATION_CODE_ALPHABET).toHaveLength(32);
    expect(INVITATION_CODE_LENGTH).toBe(8);
  });
});

describe('AdminCreateInvitationCodesRequestSchema', () => {
  const decode = Schema.decodeUnknownSync(AdminCreateInvitationCodesRequestSchema);

  test('accepts an event code', () => {
    expect(decode({ count: 1, prefix: 'sf-meetup', maxRedemptions: 50 })).toMatchObject({ maxRedemptions: 50 });
  });

  test('rejects capacity outside 1-100 and fractional counts', () => {
    expect(() => decode({ count: 1, maxRedemptions: 0 })).toThrow();
    expect(() => decode({ count: 1, maxRedemptions: 101 })).toThrow();
    expect(() => decode({ count: 1.5 })).toThrow();
  });

  test('rejects malformed prefixes and batches of vanity codes', () => {
    expect(() => decode({ count: 1, prefix: 'ab' })).toThrow();
    expect(() => decode({ count: 1, prefix: 'sf--meetup' })).toThrow();
    expect(() => decode({ count: 2, prefix: 'MEETUP' })).toThrow();
  });

  test('rejects a plan on a multi-use code', () => {
    expect(() => decode({ count: 1, maxRedemptions: 5, planName: 'internal' })).toThrow();
  });
});

describe('RedeemInvitationCodeRequestSchema', () => {
  test('requires all three fields with valid code', () => {
    const decode = Schema.decodeUnknownSync(RedeemInvitationCodeRequestSchema);
    const request = decode({
      code: 'AB12CDEF',
      identityKey: 'identity-hex',
      email: 'user@example.com',
    });
    expect(request.code).toBe('AB12CDEF');
  });

  test('rejects malformed code in request', () => {
    const decode = Schema.decodeUnknownSync(RedeemInvitationCodeRequestSchema);
    expect(() =>
      decode({
        code: 'not a code',
        identityKey: 'identity-hex',
        email: 'user@example.com',
      }),
    ).toThrow();
  });
});

describe('EdgeCredentialsHeaderCodec', () => {
  // Bytes chosen so the base64 contains both `/` and `=` padding — the two characters the
  // WebSocket subprotocol framing has to work around.
  const PRESENTATION = new Uint8Array([0xff, 0xfe, 0xfd, 0x00, 0x01, 0x02, 0x7f, 0x80]);

  test('the HTTP framing matches the literal both ends already produce', () => {
    // Pinned against the hand-rolled encoders this codec replaces, so adopting it cannot silently
    // change the wire format.
    expect(EdgeCredentialsHeaderCodec.encode(PRESENTATION)).toBe('VerifiablePresentation pb;base64,//79AAECf4A=');
  });

  test('the WebSocket framing strips padding and substitutes the illegal slash', () => {
    expect(EdgeCredentialsHeaderCodec.encodeWebSocketProtocol(PRESENTATION)).toBe(
      'base64url.bearer.authorization.dxos.org.||79AAECf4A',
    );
  });

  test('both framings round-trip', () => {
    const { encode, decode, encodeWebSocketProtocol, decodeWebSocketProtocol } = EdgeCredentialsHeaderCodec;
    expect(decode(encode(PRESENTATION))).toEqual(PRESENTATION);
    expect(decodeWebSocketProtocol(encodeWebSocketProtocol(PRESENTATION))).toEqual(PRESENTATION);
  });

  test('an empty presentation round-trips', () => {
    const empty = new Uint8Array(0);
    expect(EdgeCredentialsHeaderCodec.decode(EdgeCredentialsHeaderCodec.encode(empty))).toEqual(empty);
  });

  test('every payload length round-trips, covering all three padding cases', () => {
    for (let length = 0; length < 12; length++) {
      const bytes = new Uint8Array(Array.from({ length }, (_, index) => (index * 37 + 251) % 256));
      expect(EdgeCredentialsHeaderCodec.decode(EdgeCredentialsHeaderCodec.encode(bytes)), `len ${length}`).toEqual(
        bytes,
      );
      expect(
        EdgeCredentialsHeaderCodec.decodeWebSocketProtocol(EdgeCredentialsHeaderCodec.encodeWebSocketProtocol(bytes)),
        `ws len ${length}`,
      ).toEqual(bytes);
    }
  });

  test('the auth-scheme is matched case-insensitively', () => {
    // RFC 9110 §11.1 makes auth-scheme case-insensitive; a strict comparison would reject a
    // conformant peer.
    expect(EdgeCredentialsHeaderCodec.decode('verifiablepresentation pb;base64,//79AAECf4A=')).toEqual(PRESENTATION);
  });

  test('headers carrying no presentation decode to undefined rather than throwing', () => {
    // Callers fall through to another auth method on undefined, so this must not throw.
    for (const header of [
      null,
      undefined,
      '',
      'Bearer some-token',
      'VerifiablePresentation',
      'VerifiablePresentation not-a-pb-token',
      'VerifiablePresentationpb;base64,//79AAECf4A=',
    ]) {
      expect(EdgeCredentialsHeaderCodec.decode(header), JSON.stringify(header)).toBeUndefined();
    }
  });

  test('non-credential subprotocols decode to undefined', () => {
    for (const protocol of [null, undefined, '', 'edge-ws-v1', WS_AUTH_PROTOCOL_PREFIX]) {
      expect(EdgeCredentialsHeaderCodec.decodeWebSocketProtocol(protocol), JSON.stringify(protocol)).toBeUndefined();
    }
  });

  test('a malformed payload decodes to undefined rather than throwing', ({ expect }) => {
    // `atob` throws outside the base64 alphabet, which would break the `undefined` contract the
    // callers rely on to fall through to another auth method.
    expect(EdgeCredentialsHeaderCodec.decode('VerifiablePresentation pb;base64,not base64!!')).toBeUndefined();
    expect(
      EdgeCredentialsHeaderCodec.decodeWebSocketProtocol(`${WS_AUTH_PROTOCOL_PREFIX}.not base64!!`),
    ).toBeUndefined();
  });
});
