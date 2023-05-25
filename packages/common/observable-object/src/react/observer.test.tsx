//
// Copyright 2023 DXOS.org
//

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import chai, { expect } from 'chai';
import chaiDom from 'chai-dom';
import React from 'react';

import { describe, test } from '@dxos/test';

import { createStore } from '../observable-object';
import { observer } from './observer';

chai.use(chaiDom);

const store = createStore({ count: 0 });

const Test = observer(() => <button onClick={() => store.count++}>{store.count}</button>);

describe('observer', () => {
  test('reacts to changes', async () => {
    render(<Test />);

    expect(screen.getByRole('button')).to.contain.text('0');

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).to.contain.text('1');
  });
});
