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

const useIsDirectlyAttended = (attendableId?: string) => {
  const { attended } = useAttentionContext(ATTENTION_NAME);
  const attendedArray = Array.from(attended);
  return attendedArray.length === 1 && attendedArray[0] === attendableId;
};

/**
 * Computes HTML element attributes to apply so the attention system can detect changes
 * @param attendableId
 */
const createAttendableAttributes = (attendableId?: string) => {
  return { 'data-attendable-id': attendableId };
};

/**
 * Accumulates all attendable id’s between the element provided and the root, inclusive.
 */
const getAttendables = (selector: string, cursor: Element, acc: string[] = []): string[] => {
  // Find the closest element with `data-attendable-id`, if any; start from cursor and move up the DOM tree.
  const closestAttendable = cursor.closest(selector);
  if (!closestAttendable) {
    return acc;
  } else {
    const attendableId = closestAttendable.getAttribute('data-attendable-id');
    if (!attendableId) {
      // this has an id of an aria-controls elsewhere on the page, move cursor to that trigger
      const trigger = document.querySelector(`[aria-controls="${closestAttendable.getAttribute('id')}"]`);
      if (!trigger) {
        return acc;
      } else {
        return getAttendables(selector, trigger, acc);
      }
    } else {
      acc.push(attendableId);
      // (attempt tail recursion)
      return !closestAttendable.parentElement ? acc : getAttendables(selector, closestAttendable.parentElement, acc);
    }
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
    const selector = [
      '[data-attendable-id]',
      ...Array.from(document.querySelectorAll('[aria-controls]')).map(
        (el) => `[id="${el.getAttribute('aria-controls')}"]`,
      ),
    ].join(',');
    const nextAttended = new Set(getAttendables(selector, event.target));
    const [prev, next] = [Array.from(attended), Array.from(nextAttended)];
    // Only update state if the result is different.
    (prev.length !== next.length || !!prev.find((id, index) => next[index] !== id)) && setAttended(nextAttended);
  };
  return (
    <AttentionContextProvider attended={attended}>
      <div role='none' className='contents' onFocusCapture={handleFocus}>
        {children}
      </div>
    </AttentionContextProvider>
  );
};

export {
  AttentionProvider,
  useAttentionContext,
  useHasAttention,
  useIsDirectlyAttended,
  createAttendableAttributes,
  ATTENTION_NAME,
};

export type { AttentionContextValue };
