//
// Copyright 2020 DXOS.org
//

import { screen, render } from '@testing-library/react';
import React from 'react';

import DeleteConfirmation from '../src/components/DeleteConfirmation';

describe('DeleteConfirmation', () => {
  test('Renders the component', async () => {
    render(
      <DeleteConfirmation
        isDeleted={true}
      />
    );

    expect(() => screen.getByText('Restore')).not.toThrow();
  });
});
