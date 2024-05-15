//
// Copyright 2024 DXOS.org
//

// NOTE(thure): The following unused imports quell TS2742 (“likely not portable”).

// eslint-disable-next-line unused-imports/no-unused-imports
import { createContext, type Scope, type CreateScope } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
// eslint-disable-next-line unused-imports/no-unused-imports
import React, { ComponentProps, type FocusEvent, type HTMLAttributes, type PropsWithChildren, useState } from 'react';

const ATTENTION_NAME = 'Attention';

type AttentionContextValue = {
  attended: Set<string>;
};

const [AttentionContextProvider, useAttentionContext] = createContext<AttentionContextValue>(ATTENTION_NAME, {
  attended: new Set(),
});

const useHasAttention = (attendableId?: string) => {
  const { attended } = useAttentionContext(ATTENTION_NAME);
  return attendableId ? attended.has(attendableId) : false;
};

/**
 * Computes HTML element attributes to apply so the attention system can detect changes
 * @param attendableId
 */
const useAttendable = (attendableId?: string) => {
  return { 'data-attendable-id': attendableId };
};

/**
 * Accumulates all attendable id’s between the element provided and the root, inclusive.
 * @param cursor
 */
const getAttendables = (cursor: Element, acc: string[] = []): string[] => {
  // Find the closest element with `data-attendable-id`, if any; start from cursor and move up the DOM tree.
  const closestAttendable = cursor.closest('[data-attendable-id]');
  if (!closestAttendable) {
    return acc;
  } else {
    acc.push(closestAttendable.getAttribute('data-attendable-id')!);
    // (attempt tail recursion)
    return !closestAttendable.parentElement ? acc : getAttendables(closestAttendable.parentElement, acc);
  }
};

const AttentionProvider = ({
  children,
  attended: propsAttended,
  defaultAttended,
  onChangeAttend,
}: PropsWithChildren<
  Partial<{
    attended: Set<string>;
    onChangeAttend: (nextAttended: Set<string>) => void;
    defaultAttended: Set<string>;
  }>
>) => {
  const [attended = new Set(), setAttended] = useControllableState<Set<string>>({
    prop: propsAttended,
    defaultProp: defaultAttended,
    onChange: onChangeAttend,
  });
  const handleFocus = (event: FocusEvent) => {
    setAttended(new Set(getAttendables(event.target)));
  };
  return (
    <AttentionContextProvider attended={attended}>
      <div role='none' className='contents' onFocusCapture={handleFocus}>
        {children}
      </div>
    </AttentionContextProvider>
  );
};

export { AttentionProvider, useAttentionContext, useHasAttention, useAttendable, ATTENTION_NAME };

export type { AttentionContextValue };
