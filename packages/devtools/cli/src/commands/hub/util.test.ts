//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import { allowsAdminKey } from './util';

describe('allowsAdminKey', () => {
  test('permits https to any host', ({ expect }) => {
    expect(allowsAdminKey(new URL('https://dxos.network/hub/'))).to.be.true;
  });

  test('permits cleartext to loopback, where a `wrangler dev` EDGE answers', ({ expect }) => {
    expect(allowsAdminKey(new URL('http://localhost:8787/hub/'))).to.be.true;
    expect(allowsAdminKey(new URL('http://127.0.0.1:8787/hub/'))).to.be.true;
    expect(allowsAdminKey(new URL('http://[::1]:8787/hub/'))).to.be.true;
  });

  test('refuses cleartext to a remote host', ({ expect }) => {
    expect(allowsAdminKey(new URL('http://evil.example/hub/'))).to.be.false;
  });
});
