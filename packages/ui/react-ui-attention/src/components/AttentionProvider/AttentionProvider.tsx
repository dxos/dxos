//
// Copyright 2024 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, {
  type ComponentPropsWithRef,
  type FocusEvent,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useContext,
} from 'react';

import { log } from '@dxos/log';
import { useDefaultValue } from '@dxos/react-hooks';
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { ATTENDABLE_SELECTOR, AttentionManager, getAttendables } from '../../types/Attention';
import { AttentionContextProvider, useAttentionAttributes } from './attention-context';

type RootAttentionProviderProps = PropsWithChildren<{
  attention?: AttentionManager;
  onChange?: (nextAttended: string[]) => void;
}>;

const RootAttentionProvider = ({ children, attention: propsAttention, onChange }: RootAttentionProviderProps) => {
  const registry = useContext(RegistryContext);
  const attention = useDefaultValue(propsAttention, () => new AttentionManager(registry));

  const handleFocus = useCallback(
    (event: FocusEvent) => {
      // NOTE(thure): Use the following to debug focus movement across the app:
      log('focus', { related: event.relatedTarget, target: event.target });

      const selector = [
        ATTENDABLE_SELECTOR,
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
    },
    [attention, onChange],
  );

  return (
    <AttentionContextProvider attention={attention}>
      <div className='contents' onFocusCapture={handleFocus}>
        {children}
      </div>
    </AttentionContextProvider>
  );
};

export type AttendableContainerProps = ThemedClassName<
  ComponentPropsWithRef<'div'> & { id: string; asChild?: boolean }
>;

/**
 * Note that DeckPlugin and StackPlugin both handle attention on their own,
 * and when rendering content in those cases it is not necessary to also render an `AttendableContainer`.
 * This component is primarily for Storybook stories and other testing scenarios,
 * or the rare cases where an attendable entity is rendered outside of either of those plugins.
 */
const AttendableContainer = forwardRef<HTMLDivElement, AttendableContainerProps>(
  ({ id, classNames, children, asChild, ...props }, forwardedRef) => {
    const attentionAttrs = useAttentionAttributes(id);
    return (
      <ark.div
        asChild={asChild}
        {...props}
        {...attentionAttrs}
        className={mx('dx-attention-surface', props.tabIndex === 0 && 'dx-focus-ring-inset-over-all', classNames)}
        ref={forwardedRef}
      >
        {children}
      </ark.div>
    );
  },
);

export { AttendableContainer, RootAttentionProvider };
