//
// Copyright 2024 DXOS.org
//

// NOTE(thure): The following unused imports quell TS2742 (“likely not portable”).

// eslint-disable-next-line unused-imports/no-unused-imports
import { createContext, type Scope, type CreateScope } from '@radix-ui/react-context';
import React, { useMemo, type FocusEvent, type PropsWithChildren } from 'react';

import { create } from '@dxos/echo-schema';
import { useDefaultValue } from '@dxos/react-ui';

const ATTENTION_NAME = 'Attention';

type Attention = {
  attended: string[];
};

type AttentionContextValue = {
  attention: Attention;
  path: string[];
};

const [AttentionContextProvider, useAttentionContext] = createContext<AttentionContextValue>(ATTENTION_NAME, {
  attention: { attended: [] },
  path: [],
});

type UseAttention = {
  hasAttention: boolean;
  isAncestor: boolean;
  isRelated: boolean;
};

const useAttention = (attendableId?: string): UseAttention => {
  const { attention, path } = useAttentionContext(ATTENTION_NAME);
  if (!attendableId) {
    return { hasAttention: false, isAncestor: false, isRelated: false };
  }

  const current = [attendableId, ...path];
  const hasAttention =
    current.length === attention.attended.length && current.every((id, index) => attention.attended[index] === id);

  const isAncestor =
    current.length < attention.attended.length &&
    attention.attended.slice(-current.length).every((id, index) => current[index] === id);

  const isRelated = attendableId === attention.attended[0];

  return { hasAttention, isAncestor, isRelated };
};

const useAttended = () => {
  const { attention } = useAttentionContext(ATTENTION_NAME);
  return attention.attended;
};

/**
 * Computes HTML element attributes to apply so the attention system can detect changes
 * @param attendableId
 */
const useAttendableAttributes = (attendableId?: string) => {
  const { hasAttention } = useAttention(attendableId);

  return useMemo(() => {
    const attributes: Record<string, string | undefined> = { 'data-attendable-id': attendableId };

    if (hasAttention) {
      attributes['data-is-attention-source'] = 'true';
    }

    return attributes;
  }, [attendableId, hasAttention]);
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

const RootAttentionProvider = ({
  children,
  attention: propsAttention,
  onChange,
}: PropsWithChildren<
  Partial<{
    attention: Attention;
    onChange: (nextAttended: string[]) => void;
  }>
>) => {
  const attention = useDefaultValue(propsAttention, () => create<Attention>({ attended: [] }));
  const handleFocus = (event: FocusEvent) => {
    const selector = [
      '[data-attendable-id]',
      ...Array.from(document.querySelectorAll('[aria-controls]')).map(
        (el) => `[id="${el.getAttribute('aria-controls')}"]`,
      ),
    ].join(',');
    const prev = attention.attended;
    const next = Array.from(new Set(getAttendables(selector, event.target)));
    // TODO(wittjosiah): Not allowing empty state means that the attended item is not strictly guaranteed to be in the DOM.
    //   Currently this depends on the deck in order to ensure that when the attended item is removed something else is attended.
    // Only update state if the result is different and not empty.
    if (next.length > 0 && (prev.length !== next.length || !!prev.find((id, index) => next[index] !== id))) {
      attention.attended = next;
      onChange?.(next);
    }
  };
  return (
    <AttentionContextProvider attention={attention} path={[]}>
      <div role='none' className='contents' onFocusCapture={handleFocus}>
        {children}
      </div>
    </AttentionContextProvider>
  );
};

const AttentionProvider = ({ id, children }: PropsWithChildren<{ id: string }>) => {
  const { attention, path } = useAttentionContext(ATTENTION_NAME);
  const nextPath = useMemo(() => [id, ...path], [id, path]);

  return (
    <AttentionContextProvider attention={attention} path={nextPath}>
      {children}
    </AttentionContextProvider>
  );
};

export {
  RootAttentionProvider,
  AttentionProvider,
  useAttentionContext,
  useAttention,
  useAttended,
  useAttendableAttributes,
  ATTENTION_NAME,
};

export type { Attention, AttentionContextValue };
