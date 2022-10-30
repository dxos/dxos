//
// Copyright 2022 DXOS.org
//

import React, { useRef, useState } from 'react';

export default {
  title: 'Testing/Sanity'
};

/**
 * Playwright tests.
 * @constructor
 */
export const Primary = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ value: string }>();
  const handleClick = () => {
    setState({ value: inputRef.current!.value });
  };

  return (
    <div>
      <input data-id='test-input' ref={inputRef} type='text' />
      <button data-id='test-button' onClick={handleClick}>
        Test
      </button>
      <div>
        <pre data-id='test-value'>{JSON.stringify(state)}</pre>
      </div>
    </div>
  );
};
