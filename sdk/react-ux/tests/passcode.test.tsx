//
// Copyright 2020 DXOS.org
//

import { screen, render } from '@testing-library/react';
import React from 'react';

import { Passcode } from '../src';

const props = {
  attempt: 1,
  editable: true,
  length: 4,
  onChange: () => null,
  onSubmit: () => null
};

describe('Passcode', () => {
  test('Renders the component', async () => {
    render(
      <Passcode
        {...props}
      />
    );

    expect(() => screen.getByTestId('passcode-input')).not.toThrow();
  });
});
