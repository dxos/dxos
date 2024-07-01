//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';
import { describe, test } from 'vitest';

import { ParamKeyAnnotation, Params } from './params';

const InvitationUrl = S.Struct({
  accessToken: S.String,
  deviceInvitationCode: S.String.pipe(ParamKeyAnnotation('deviceInvitationCode')),
  spaceInvitationCode: S.String,
  experimental: S.Boolean,
  timeout: S.Number,
});

describe('Params', () => {
  test('parse', () => {
    const props = new Params(InvitationUrl);

    const values = props.parse(
      new URL('http://localhost?access_token=100&deviceInvitationCode=200&experimental=1&timeout=100'),
    );
    expect(values).to.deep.eq({
      accessToken: '100',
      deviceInvitationCode: '200',
      experimental: true,
      timeout: 100,
    });

    const url = props.params(new URL('http://localhost'), values);
    expect(url.toString()).to.eq(
      'http://localhost/?access_token=100&deviceInvitationCode=200&experimental=true&timeout=100',
    );
  });
});
