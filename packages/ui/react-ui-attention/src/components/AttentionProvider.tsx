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
import { ATTENDABLE_PATH_SEPARATOR, type Attention } from '../types';

const ATTENTION_NAME = 'Attention';
const ATTENDABLE_ATTRIBUTE = 'data-attendable-id';
const ATTENTION_SOURCE_ATTRIBUTE = 'data-w-attention-source';

type AttentionContextValue = {
  attention: AttentionManager;
  path: string[];
};

const [AttentionContextProvider, useAttentionContext] = createContext<AttentionContextValue>(ATTENTION_NAME, {
  attention: undefined as unknown as AttentionManager,
  path: [],
});

const UNKNOWN_ATTENDABLE = { hasAttention: false, isAncestor: false, isRelated: false } as Attention;

const useAttention = (attendableId?: string): Attention => {
  const { attention, path } = useAttentionContext(ATTENTION_NAME);
  const [state, setState] = useState<Attention>(UNKNOWN_ATTENDABLE);

  const key = useMemo(() => {
    if (!attendableId) {
      return undefined;
    }
    return [...attendableId.split(ATTENDABLE_PATH_SEPARATOR), ...path];
  }, [attendableId, path]);

  useEffect(() => {
    if (!key || !attention) {
      setState(UNKNOWN_ATTENDABLE);
      return;
    }

    // Set initial state.
    setState(attention.get(key));

    // Subscribe to changes.
    return attention.subscribe(key, (newState) => {
      setState(newState);
    });
  }, [attention, key]);

  return state;
};

const useAttended = () => {
  const { attention } = useAttentionContext(ATTENTION_NAME);
  const [current, setCurrent] = useState<readonly string[]>([]);

  useEffect(() => {
    if (!attention) {
      return;
    }

    // Set initial state.
    setCurrent(attention.getCurrent());

    // Subscribe to changes.
    return attention.subscribeCurrent((newCurrent) => {
      setCurrent(newCurrent);
    });
  }, [attention]);

  return current;
};

/**
 * Computes HTML element attributes to apply so the attention system can detect changes.
 * @param attendableId
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

const useAttentionPath = () => {
  const { path } = useAttentionContext(ATTENTION_NAME);
  return path;
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
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root
        role='none'
        {...attentionAttrs}
        {...props}
        className={mx('attention-surface', props.tabIndex === 0 && 'dx-focus-ring-inset-over-all', classNames)}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

export {
  RootAttentionProvider,
  AttentionProvider,
  AttendableContainer,
  useAttentionContext,
  useAttention,
  useAttended,
  useAttentionAttributes,
  useAttentionPath,
  ATTENTION_NAME,
  ATTENDABLE_ATTRIBUTE,
  ATTENTION_SOURCE_ATTRIBUTE,
};
