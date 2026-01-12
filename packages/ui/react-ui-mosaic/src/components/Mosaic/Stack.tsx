//
// Copyright 2026 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type FC, Fragment, type ReactElement, type Ref, forwardRef, useRef } from 'react';

import { type Obj } from '@dxos/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useVisibleItems } from '../../hooks';
import { Mosaic, useMosaicContainer } from '../Mosaic';

import { type Axis } from './types';

type StackProps<T extends Obj.Any = Obj.Any> = ThemedClassName<{
  asChild?: boolean;
  role?: string;
  axis?: Axis;
  items?: T[];
  Component?: FC<{ object: T; location: number }>;
}> & { className?: string };

const StackInner = forwardRef<HTMLDivElement, StackProps>(
  (
    { className, classNames, asChild, role = 'list', axis = 'vertical', items, Component = DefaultComponent, ...props },
    forwardedRef,
  ) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    const Root = asChild ? Slot : Primitive.div;

    const { id, dragging } = useMosaicContainer(StackInner.displayName!);
    const visibleItems = useVisibleItems({ id, items, dragging: dragging?.source.data });

    return (
      <Root {...props} role={role} className={mx(classNames, className)} ref={composedRef}>
        <Mosaic.Placeholder axis={axis} location={0.5} />
        {visibleItems?.map((item, index) => (
          <Fragment key={item.id}>
            <Component object={item} location={index + 1} />
            <Mosaic.Placeholder axis={axis} location={index + 1.5} />
          </Fragment>
        ))}
      </Root>
    );
  },
);

StackInner.displayName = 'Stack';

const DefaultComponent: FC<{ object: Obj.Any; location: number }> = ({ object }) => <div role='none'>{object.id}</div>;

const Stack = StackInner as <T extends Obj.Any = Obj.Any>(
  props: StackProps<T> & { ref?: Ref<HTMLDivElement> },
) => ReactElement;

export { Stack };

export type { StackProps };
