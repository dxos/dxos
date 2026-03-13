//
// Copyright 2024 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, {
  type ComponentPropsWithRef,
  type FocusEvent,
  type PropsWithChildren,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { log } from '@dxos/log';
import { useDefaultValue } from '@dxos/react-hooks';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { AttentionManager, getAttendables } from '../attention';
import { type Attention } from '../types';

const ATTENTION_NAME = 'Attention';
const ATTENDABLE_ATTRIBUTE = 'data-attendable-id';
const ATTENTION_SOURCE_ATTRIBUTE = 'data-w-attention-source';

type AttentionContextValue = {
  attention: AttentionManager;
};

const [AttentionContextProvider, useAttentionContext] = createContext<AttentionContextValue>(ATTENTION_NAME, {
  attention: undefined as unknown as AttentionManager,
});

const UNKNOWN_ATTENDABLE = { hasAttention: false, isAncestor: false, isRelated: false } as Attention;

/**
 * Subscribe to the attention state for a qualified graph ID.
 */
const useAttention = (attendableId?: string): Attention => {
  const { attention } = useAttentionContext(ATTENTION_NAME);
  const [state, setState] = useState<Attention>(UNKNOWN_ATTENDABLE);

  useEffect(() => {
    if (!attendableId || !attention) {
      setState(UNKNOWN_ATTENDABLE);
      return;
    }

    const currentState = attention.get(attendableId);
    setState(currentState);

    return attention.subscribe(attendableId, (newState) => {
      setState(newState);
    });
  }, [attention, attendableId]);

  return state;
};

const useAttended = () => {
  const { attention } = useAttentionContext(ATTENTION_NAME);
  const [current, setCurrent] = useState<readonly string[]>([]);

  useEffect(() => {
    if (!attention) {
      return;
    }

    setCurrent(attention.getCurrent());

    return attention.subscribeCurrent((newCurrent) => {
      setCurrent(newCurrent);
    });
  }, [attention]);

  return current;
};

/**
 * Computes HTML element attributes to apply so the attention system can detect changes.
 */
const useAttentionAttributes = (attendableId?: string) => {
  const { hasAttention } = useAttention(attendableId);
  return useMemo(() => {
    const attributes: Record<string, string | undefined> = { [ATTENDABLE_ATTRIBUTE]: attendableId };
    if (hasAttention) {
      attributes[ATTENTION_SOURCE_ATTRIBUTE] = 'true';
    }

    return attributes;
  }, [attendableId, hasAttention]);
};

const RootAttentionProvider = ({
  children,
  attention: propsAttention,
  onChange,
}: PropsWithChildren<
  Partial<{
    attention: AttentionManager;
    onChange: (nextAttended: string[]) => void;
  }>
>) => {
  const registry = useContext(RegistryContext);
  const attention = useDefaultValue(propsAttention, () => new AttentionManager(registry));

  const handleFocus = (event: FocusEvent) => {
    // NOTE(thure): Use the following to debug focus movement across the app:
    log('focus', { related: event.relatedTarget, target: event.target });

    const selector = [
      '[data-attendable-id]',
      ...Array.from(document.querySelectorAll('[aria-controls]')).map(
        (el) => `[id="${el.getAttribute('aria-controls')}"]`,
      ),
    ].join(',');
    const prev = attention.getCurrent();
    const next = getAttendables(selector, event.target);
    // TODO(wittjosiah): Not allowing empty state means that the attended item is not strictly guaranteed to be in the DOM.
    //   Currently this depends on the deck in order to ensure that when the attended item is removed something else is attended.
    // Only update state if the result is different and not empty.
    if (next.length > 0 && (prev.length !== next.length || !!prev.find((id, index) => next[index] !== id))) {
      attention.update(next);
      onChange?.(next);
    }
  };

  return (
    <AttentionContextProvider attention={attention}>
      <div role='none' className='contents' onFocusCapture={handleFocus}>
        {children}
      </div>
    </AttentionContextProvider>
  );
};

export type AttendableContainerProps = ThemedClassName<
  ComponentPropsWithRef<'div'> & { id: string; asChild?: boolean }
>;

/**
 * Note that DeckPlugin and StackPlugin both handle attention on their own, and when rendering content in those cases it
 * is not necessary to also render an `AttendableContainer`. This component is primarily for Storybook stories and other
 * testing scenarios, or the rare cases where an attendable entity is rendered outside of either of those plugins.
 */
const AttendableContainer = forwardRef<HTMLDivElement, AttendableContainerProps>(
  ({ id, classNames, children, asChild, ...props }, forwardedRef) => {
    const attentionAttrs = useAttentionAttributes(id);
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp
        role='none'
        {...attentionAttrs}
        {...props}
        className={mx('dx-attention-surface', props.tabIndex === 0 && 'dx-focus-ring-inset-over-all', classNames)}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);

export {
  RootAttentionProvider,
  AttendableContainer,
  useAttentionContext,
  useAttention,
  useAttended,
  useAttentionAttributes,
  ATTENTION_NAME,
  ATTENDABLE_ATTRIBUTE,
  ATTENTION_SOURCE_ATTRIBUTE,
};
