//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import 'raf/polyfill';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import waitForExpect from 'wait-for-expect';

import { useStateUpdater } from './useStateUpdater';

// Don't copy this.
const complex = {

};

const Test = () => {
  const [value,, updateValue] = useStateUpdater({ complex, items: [] });
  useEffect(() => {
    updateValue({
      items: {
        $push: [1, 2, 3]
      }
    })
  }, []);

  return (
    <pre>{JSON.stringify(value)}</pre>
  );
};

let rootContainer: any;

beforeEach(() => {
  rootContainer = document.createElement('div');
  document.body.appendChild(rootContainer);
});

afterEach(() => {
  document.body.removeChild(rootContainer);
  rootContainer = null;
});

describe('useStateMutator', () => {
  it('udpates the value.', async () => {
    act(() => {
      ReactDOM.render(<Test />, rootContainer);
    });

    const pre = rootContainer.querySelector('pre');
    await waitForExpect(() => {
      const data = JSON.parse(pre.textContent);
      expect(data).toEqual({ complex, items: [1, 2, 3] });
    });
  });
});
