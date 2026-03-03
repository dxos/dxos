//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';

import * as Expando from './Expando';

describe('Expando', () => {
  test('Obj.instanceOf works with Expando', ({ expect }) => {
    const obj = Expando.make({ name: 'test', value: 42 });

    expect(Obj.instanceOf(Expando.Expando, obj)).to.be.true;

    // Curried form.
    const isExpando = Obj.instanceOf(Expando.Expando);
    expect(isExpando(obj)).to.be.true;

    // Negative case.
    expect(isExpando({})).to.be.false;
    expect(isExpando({ id: 'fake' })).to.be.false;
  });

  test('typename and version are accessible', ({ expect }) => {
    expect(Expando.Expando.typename).to.eq('dxos.org/type/Expando');
    expect(Expando.Expando.version).to.eq('0.1.0');
  });
});
