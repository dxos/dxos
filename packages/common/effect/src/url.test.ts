//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { ParamKeyAnnotation, UrlParser } from './url';

const Invitation = Schema.Struct({
  accessToken: Schema.String,
  deviceInvitationCode: Schema.String.pipe(ParamKeyAnnotation({ key: 'deviceInvitationCode' })),
  spaceInvitationCode: Schema.String,
  experimental: Schema.Boolean,
  testing: Schema.Boolean,
  timeout: Schema.Number,
});

describe('Params', () => {
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
