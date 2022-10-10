//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import 'raf/polyfill.js';
import React, { useState } from 'react';
import { render } from 'react-dom';
import { act } from 'react-dom/test-utils.js';
import { default as waitForExpect } from 'wait-for-expect';

import { useAsyncEffect } from './useAsyncEffect.js';

const doAsync = async <T, >(value: T) => await new Promise<T>((resolve) => {
  resolve(value);
});

const Test = () => {
  const [value, setValue] = useState<string>();
  useAsyncEffect(async (isMounted) => {
    const value = await doAsync('DXOS');
    if (isMounted()) {
      act(() => {
        setValue(value);
      });
    }
  }, []);

  return (
    <h1>{value}</h1>
  );
};

let rootContainer: HTMLElement;

describe('useAsyncEffect', function () {
  beforeEach(function () {
    rootContainer = document.createElement('div');
    document.body.appendChild(rootContainer);
  });

  afterEach(function () {
    document.body.removeChild(rootContainer!);
  });

  it('gets async value.', async function () {
    act(() => {
      render(<Test />, rootContainer);
    });

    const h1 = rootContainer.querySelector('h1');
    await waitForExpect(() => {
      expect(h1?.textContent).toEqual('DXOS');
    });
  });
});
