//
// Copyright 2024 DXOS.org
//

// NOTE(thure): The following unused imports quell TS2742 (“likely not portable”).

// eslint-disable-next-line unused-imports/no-unused-imports
import { createContext, type Scope, type CreateScope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { useMemo, type FocusEvent, type PropsWithChildren, type ComponentPropsWithRef, forwardRef } from 'react';

import { useDefaultValue, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type Attention, AttentionManager, getAttendables } from '../attention';

const ATTENTION_NAME = 'Attention';
const ATTENABLE_ATTRIBUTE = 'data-attendable-id';
const ATTENTION_SOURCE_ATTRIBUTE = 'data-is-attention-source';

type AttentionContextValue = {
  attention: AttentionManager;
  path: string[];
};

const [AttentionContextProvider, useAttentionContext] = createContext<AttentionContextValue>(ATTENTION_NAME, {
  attention: new AttentionManager(),
  path: [],
});

const UNKNOWN_ATTENDABLE = { hasAttention: false, isAncestor: false, isRelated: false };

const useAttention = (attendableId?: string): Attention => {
  const { attention, path } = useAttentionContext(ATTENTION_NAME);
  if (!attendableId) {
    return UNKNOWN_ATTENDABLE;
  }

  const current = [attendableId, ...path];
  return attention.get(current);
};

const useAttended = () => {
  const { attention } = useAttentionContext(ATTENTION_NAME);
  return attention.current;
};

/**
 * Computes HTML element attributes to apply so the attention system can detect changes
 * @param attendableId
 */
const useAttendableAttributes = (attendableId?: string) => {
  const { hasAttention } = useAttention(attendableId);
  return useMemo(() => {
    const attributes: Record<string, string | undefined> = { [ATTENABLE_ATTRIBUTE]: attendableId };
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
  const attention = useDefaultValue(propsAttention, () => new AttentionManager());
  const handleFocus = (event: FocusEvent) => {
    const selector = [
      '[data-attendable-id]',
      ...Array.from(document.querySelectorAll('[aria-controls]')).map(
        (el) => `[id="${el.getAttribute('aria-controls')}"]`,
      ),
    ].join(',');
    const prev = attention.current;
    const next = getAttendables(selector, event.target);
    // TODO(wittjosiah): Not allowing empty state means that the attended item is not strictly guaranteed to be in the DOM.
    //   Currently this depends on the deck in order to ensure that when the attended item is removed something else is attended.
    // Only update state if the result is different and not empty.
    if (next.length > 0 && (prev.length !== next.length || !!prev.find((id, index) => next[index] !== id))) {
      attention.update(next);
      onChange?.(next);
    }
  };

  // NOTE(thure): Use the following to debug the macOS package issue #8540

  // const [startEl, setStartEl] = useState<HTMLElement | null>(null);
  // const [endEl, setEndEl] = useState<HTMLElement | null>(null);
  //
  // const handleEventDebug = useCallback((event: any) => {
  //   console.log(`[${event.type}]`, event.target, event.currentTarget, [event.clientX, event.clientY]);
  // }, []);
  //
  // const handleStartDebug = useCallback(
  //   (event: any) => {
  //     setStartEl(event.target);
  //     handleEventDebug(event);
  //   },
  //   [handleEventDebug],
  // );
  //
  // const handleEndDebug = useCallback(
  //   (event: any) => {
  //     setEndEl(event.target);
  //     handleEventDebug(event);
  //   },
  //   [handleEventDebug],
  // );
  //
  // const handleClickDebug = useCallback(
  //   (event: any) => {
  //     console.log('[click compare]', startEl, endEl, startEl === endEl);
  //     handleEventDebug(event);
  //   },
  //   [startEl, endEl, handleEventDebug],
  // );

  return (
    <AttentionContextProvider attention={attention} path={[]}>
      <div
        role='none'
        className='contents'
        onFocusCapture={handleFocus}
        // onClick={handleClickDebug}
        // onMouseDown={handleStartDebug}
        // onMouseUp={handleEndDebug}
      >
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
    const attendableAttrs = useAttendableAttributes(id);
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root
        role='none'
        {...attendableAttrs}
        {...props}
        className={mx('attention-surface', props.tabIndex === 0 && 'ch-focus-ring-inset-over-all', classNames)}
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
  useAttendableAttributes,
  useAttentionPath,
  ATTENTION_NAME,
  ATTENABLE_ATTRIBUTE,
  ATTENTION_SOURCE_ATTRIBUTE,
};
