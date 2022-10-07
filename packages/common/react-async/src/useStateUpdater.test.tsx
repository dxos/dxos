//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import 'raf/polyfill';
import React, { useEffect } from 'react';
import { render } from 'react-dom';
import { act } from 'react-dom/test-utils';
import waitForExpect from 'wait-for-expect';

import { useStateUpdater } from './useStateUpdater';

// Expensive object to copy.
const complex = {
  data: Array.from({ length: 100 }).map((_, i) => ({
    title: String(i)
  }))
};

const Test = () => {
  const [value,, updateValue] = useStateUpdater({ complex, items: [] });
  useEffect(() => {
    // https://github.com/kolodny/immutability-helper
    updateValue({
      items: {
        $push: [1, 2, 3]
      }
    });
  }, []);

  return (
    <pre>{JSON.stringify(value)}</pre>
  );
};

let rootContainer: HTMLElement;

describe('useStateMutator', function () {
  beforeEach(function () {
    rootContainer = document.createElement('div');
    document.body.appendChild(rootContainer);
  });

  afterEach(function () {
    document.body.removeChild(rootContainer);
  });

  it('udpates the value.', async function () {
    act(() => {
      render(<Test />, rootContainer);
    });

    const pre = rootContainer.querySelector('pre');
    await waitForExpect(() => {
      const data = JSON.parse(pre?.textContent ?? '{}');
      expect(data).toEqual({ complex, items: [1, 2, 3] });
    });
  });
});
