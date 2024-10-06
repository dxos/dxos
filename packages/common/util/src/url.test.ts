//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { describe, expect, test } from 'vitest';

import { ParamKeyAnnotation, UrlParser } from './url';

const p = ParamKeyAnnotation({ key: 'deviceInvitationCode' });

const Invitation = S.Struct({
  accessToken: S.String,
  deviceInvitationCode: S.String.pipe(ParamKeyAnnotation({ key: 'deviceInvitationCode' })),
  spaceInvitationCode: S.String,
  experimental: S.Boolean,
  testing: S.Boolean,
  timeout: S.Number,
});

describe.only('Params', () => {
  test('parse', () => {
    const parser = new UrlParser(Invitation);
    const values = parser.parse(
      'http://localhost?access_token=100&deviceInvitationCode=200&experimental=1&testing=false&timeout=100',
    );
    expect(values).to.deep.eq({
      accessToken: '100',
      deviceInvitationCode: '200',
      experimental: true,
      testing: false,
      timeout: 100,
    });

    const url = parser.create('http://localhost', values);
    expect(url.toString()).to.eq(
      'http://localhost/?access_token=100&deviceInvitationCode=200&experimental=true&testing=false&timeout=100',
    );
  });
});
