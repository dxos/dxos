//
// Copyright 2023 DXOS.org
//

import React, { type ForwardedRef, type KeyboardEventHandler, forwardRef } from 'react';

export const Header = forwardRef(
  ({ onKeyDown }: { onKeyDown?: KeyboardEventHandler<HTMLInputElement> }, inputRef: ForwardedRef<HTMLInputElement>) => (
    <header className='header'>
      <h1>todos</h1>
      <input
        ref={inputRef}
        className='new-todo'
        placeholder='What needs to be done?'
        onKeyDown={onKeyDown}
        data-testid='new-todo'
      />
    </header>
  ),
);
