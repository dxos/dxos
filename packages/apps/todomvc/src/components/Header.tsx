//
// Copyright 2023 DXOS.org
//

import React, { ForwardedRef, forwardRef, KeyboardEventHandler } from 'react';

export const Header = forwardRef(
  ({ onKeyDown }: { onKeyDown?: KeyboardEventHandler<HTMLInputElement> }, inputRef: ForwardedRef<HTMLInputElement>) => (
    <header className='header'>
      <h1>todos</h1>
      <input
        ref={inputRef}
        className='new-todo'
        placeholder='What needs to be done?'
        onKeyDown={onKeyDown}
        autoFocus={true}
        data-testid={onKeyDown ? 'new-todo' : 'todo-placeholder'}
      />
    </header>
  )
);
