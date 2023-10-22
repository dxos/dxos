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

import { useDensityContext, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { DropdownMenu } from '../DropdownMenu';

type CardRootProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  grow?: boolean;
  square?: boolean;
  noPadding?: boolean;
};

// TODO(burdon): Forward refs for all components?
const CardRoot = forwardRef<HTMLDivElement, CardRootProps>(
  ({ grow, square, noPadding, classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <div {...props} ref={forwardedRef} className={tx('card.root', 'card', { grow, square, noPadding }, classNames)}>
        {children}
      </div>
    );
  },
);

type CardHeaderProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { floating?: boolean };

export const CardHeader: FC<CardHeaderProps> = ({ floating, classNames, children, ...props }) => {
  const { tx } = useThemeContext();
  return (
    <div {...props} className={tx('card.header', 'card', { floating }, classNames)}>
      {children}
    </div>
  );
};

type CardTitleProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  center?: boolean;
  title?: string;
};

export const CardTitle: FC<CardTitleProps> = ({ center, title, classNames, ...props }) => {
  const { tx } = useThemeContext();
  return (
    <div {...props} className={tx('card.title', 'card', { center }, classNames)}>
      {title}
    </div>
  );
};

// TODO(burdon): Reuse ListItemEndcap?
type CardDragHandleProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { position?: 'left' | 'right' };

const CardDragHandle: FC<CardDragHandleProps> = ({ position, classNames, ...props }) => {
  const { tx } = useThemeContext();
  const density = useDensityContext();
  return (
    <div {...props} className={tx('card.dragHandle', 'card', { density, position }, classNames)}>
      <DotsSixVertical className={tx('card.dragHandleIcon', 'card')} />
    </div>
  );
};

type CardEndcapProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { Icon: Icon; position?: 'left' | 'right' };

const CardEndcap: FC<CardEndcapProps> = ({ Icon, position, classNames, ...props }) => {
  const { tx } = useThemeContext();
  const density = useDensityContext();
  return (
    <div {...props} className={tx('card.menu', 'card', { density, position }, classNames)}>
      <Icon className={tx('card.menuIcon', 'card')} />
    </div>
  );
};

type CardMenuProps = PropsWithChildren<
  ThemedClassName<ComponentPropsWithoutRef<'div'>> & { position?: 'left' | 'right' }
>;

// TODO(burdon): Reconcile with Endcap (remove dropdown from here). See ListItem.Endcap (style icon/size?)
const CardMenu = forwardRef<HTMLDivElement, CardMenuProps>(
  ({ children, position, classNames, ...props }, forwardRef) => {
    const { tx } = useThemeContext();
    const density = useDensityContext();
    return (
      <div {...props} className={tx('card.menu', 'card', { density, position }, classNames)} ref={forwardRef}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <DotsThreeVertical className={tx('card.menuIcon', 'card', {})} />
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
  const { tx } = useThemeContext();
  const density = useDensityContext();
  return (
    <div {...props} className={tx('card.body', 'card', { density, gutter }, classNames)}>
      {children}
    </div>
  );
};

type CardMediaProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & { src?: string; contain?: boolean };

// TODO(burdon): Option to set to 50% of height of card.
export const CardMedia: FC<CardMediaProps> = ({ src, contain, classNames, ...props }) => {
  const { tx } = useThemeContext();
  return (
    <div className='flex grow overflow-hidden'>
      <img {...props} className={tx('card.media', 'card', { contain }, classNames)} src={src} />
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
