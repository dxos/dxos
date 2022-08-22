//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import 'raf/polyfill';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import waitForExpect from 'wait-for-expect';

import { useAsyncEffect } from './useAsyncEffect';

const doAsync = async <T, >(value: T) => await new Promise<T>((resolve) => {
  resolve(value);
});

const Test = () => {
  const [value, setValue] = useState<string>();
  useAsyncEffect(async (isMounted) => {
    const value = await doAsync('DXOS');
    if (isMounted()) {
      setValue(value);
    }
  }, []);

  return (
    <h1>{value}</h1>
  );
};

let rootContainer: HTMLElement;

beforeEach(() => {
  rootContainer = document.createElement('div');
  document.body.appendChild(rootContainer);
});

afterEach(() => {
  document.body.removeChild(rootContainer!);
});

describe('useAsyncEffect', () => {
  it('gets async value.', async () => {
    act(() => {
      createRoot(rootContainer).render(<Test />);
    });

    const h1 = rootContainer.querySelector('h1');
    await waitForExpect(() => {
      expect(h1?.textContent).toEqual('DXOS');
    });
  });
});
