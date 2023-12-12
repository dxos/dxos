//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, DotsThreeVertical, type Icon } from '@phosphor-icons/react';
import { type Primitive } from '@radix-ui/react-primitive';
import React, {
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type FC,
  forwardRef,
  type PropsWithChildren,
} from 'react';

import { useDensityContext, DropdownMenu, type ThemedClassName } from '@dxos/react-ui';

import {
  cardBody,
  cardDragHandle,
  cardDragHandleIcon,
  cardHeader,
  cardMedia,
  cardMenu,
  cardMenuIcon,
  cardRoot,
  cardTitle,
} from '../theme';

type CardRootProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  grow?: boolean;
  square?: boolean;
  noPadding?: boolean;
};

// TODO(burdon): Forward refs for all components?
const CardRoot = forwardRef<HTMLDivElement, CardRootProps>(
  ({ grow, square, noPadding, classNames, children, ...props }, forwardedRef) => {
    return (
      <div {...props} ref={forwardedRef} className={cardRoot({ grow, square, noPadding }, classNames)}>
        {children}
      </div>
    );
  },
);

type CardHeaderProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { floating?: boolean };

export const CardHeader: FC<CardHeaderProps> = ({ floating, classNames, children, ...props }) => {
  return (
    <div {...props} className={cardHeader({ floating }, classNames)}>
      {children}
    </div>
  );
};

type CardTitleProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  center?: boolean;
  title?: string;
};

export const CardTitle: FC<CardTitleProps> = ({ center, title, classNames, ...props }) => {
  return (
    <div {...props} className={cardTitle({ center }, classNames)}>
      {title}
    </div>
  );
};

// TODO(burdon): Reuse ListItemEndcap?
type CardDragHandleProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { position?: 'left' | 'right' };

const CardDragHandle: FC<CardDragHandleProps> = ({ position, classNames, ...props }) => {
  const density = useDensityContext();
  return (
    <div {...props} className={cardDragHandle({ density, position }, classNames)}>
      <DotsSixVertical className={cardDragHandleIcon({})} />
    </div>
  );
};

type CardEndcapProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { Icon: Icon; position?: 'left' | 'right' };

const CardEndcap: FC<CardEndcapProps> = ({ Icon, position, classNames, ...props }) => {
  const density = useDensityContext();
  return (
    <div {...props} className={cardMenu({ density, position }, classNames)}>
      <Icon className={cardMenuIcon({})} />
    </div>
  );
};

type CardMenuProps = PropsWithChildren<
  ThemedClassName<ComponentPropsWithoutRef<'div'>> & { position?: 'left' | 'right' }
>;

// TODO(burdon): Reconcile with Endcap (remove dropdown from here). See ListItem.Endcap (style icon/size?)
const CardMenu = forwardRef<HTMLDivElement, CardMenuProps>(
  ({ children, position, classNames, ...props }, forwardRef) => {
    const density = useDensityContext();
    return (
      <div {...props} className={cardMenu({ density, position }, classNames)} ref={forwardRef}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <DotsThreeVertical className={cardMenuIcon({})} />
          </DropdownMenu.Trigger>
          {/* TODO(burdon): Position to the left of the menu button. */}
          <DropdownMenu.Content>
            <DropdownMenu.Viewport>{children}</DropdownMenu.Viewport>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    );
  },
);

type CardBodyProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { gutter?: boolean };

export const CardBody: FC<CardBodyProps> = ({ gutter, classNames, children, ...props }) => {
  const density = useDensityContext();
  return (
    <div {...props} className={cardBody({ density, gutter }, classNames)}>
      {children}
    </div>
  );
};

type CardMediaProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { src?: string; contain?: boolean };

// TODO(burdon): Option to set to 50% of height of card.
export const CardMedia: FC<CardMediaProps> = ({ src, contain, classNames, ...props }) => {
  return (
    <div className='flex grow overflow-hidden'>
      <img {...props} className={cardMedia({ contain }, classNames)} src={src} />
    </div>
  );
};

export const Card = {
  Root: CardRoot,
  Header: CardHeader,
  DragHandle: CardDragHandle,
  Endcap: CardEndcap,
  Menu: CardMenu,
  Title: CardTitle,
  Body: CardBody,
  Media: CardMedia,
};

export type { CardRootProps };
