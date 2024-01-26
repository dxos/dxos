//
// Copyright 2024 DXOS.org
//

import { render, screen } from '@testing-library/react';
import chai, { expect } from 'chai';
import chaiDom from 'chai-dom';
import React, { type FC, useRef } from 'react';
import { describe, test } from 'vitest';

const Test: FC<{ value: string }> = ({ value: initialValue }) => {
  const ref = useRef<HTMLDivElement>(null);

  return <div ref={ref}></div>;
};

chai.use(chaiDom);

describe('Automerge', () => {
  // TODO(burdon): vitest.
  // const view = new EditorView({ state });
  test('EditorView', () => {
    const value = 'hello';
    render(<Test value={value} />);
    expect(screen.getByRole('textbox')).to.have.text(value);
  });
});
