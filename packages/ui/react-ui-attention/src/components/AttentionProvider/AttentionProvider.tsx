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

import { AttentionManager, attendElement } from '../../types/Attention.ts';
import { AttentionContextProvider, useAttentionAttributes } from './attention-context.ts';

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

      const next = attendElement(attention, event.target);
      if (next) {
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
