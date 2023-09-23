//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, DotsThreeVertical } from '@phosphor-icons/react';
import React, { FC, forwardRef, PropsWithChildren, ReactNode } from 'react';

import { getSize, inputSurface } from '@dxos/aurora-theme';
import { ChromaticPalette, ClassNameValue, MessageValence, NeutralPalette } from '@dxos/aurora-types';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';

type CardRootProps = ThemedClassName<PropsWithChildren<{
  palette?: NeutralPalette | ChromaticPalette | MessageValence;
  square?: boolean;
  noPadding?: boolean;
}>>;

const CardRoot = forwardRef<HTMLDivElement, CardRootProps>(({ classNames, children, palette, square, noPadding, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <div
      {...props}
      ref={forwardedRef}
      className={tx('card.root', 'card', { palette }, classNames)}
      // className={tx(
        {/*'flex flex-col group w-full min-w-[280px] max-w-[400px] max-h-[400px] overflow-hidden',*/}
        // square && 'aspect-square',
        {/*'shadow-sm rounded',*/}
        // !noPadding && 'py-2 gap-1',
        // inputSurface,
        // classNames,
      // )}
    >
      {children}
    </div>
  );
};

export const CardHeader: FC<PropsWithChildren<{ classNames?: ClassNameValue }>> = ({ classNames, children }) => {
  const { tx } = useThemeContext();
  // return <div className={tx('flex w-full px-2 overflow-hidden', classNames)}>{children}</div>;
  return <div className={tx('card.header', 'card', {}, classNames)}>{children}</div>
};

export const CardBody: FC<PropsWithChildren<{ classNames?: ClassNameValue; indent?: boolean }>> = ({
  classNames,
  children,
  indent,
}) => {
  const { tx } = useThemeContext();
  // return <div className={tx('flex flex-col px-2 gap-2', indent && 'ml-8', classNames)}>{children}</div>;
  return <div className={tx('card.body', 'card', {}, classNames)}>{children}</div>
};

// TODO(burdon): Doesn't truncate.
export const CardTitle: FC<{ classNames?: ClassNameValue; title?: string }> = ({ classNames, title }) => {
  const { tx } = useThemeContext();
  // return <div className={tx('w-full truncate', classNames)}>{title}</div>;
  return <div className={tx('card.root', 'card', {}, classNames)}>{children}</div>
};

export const CardHandle: FC<any> = ({ ...props }) => {
  const { tx } = useThemeContext();
  return <div className={tx('card.root', 'card', {}, classNames)}>{children}</div>
  // return (
  //   <div className={'flex shrink-0 mx-1 w-6 h-6 justify-center items-center'} {...props}>
  //     <DotsSixVertical className={tx(getSize(5), 'outline-none cursor-pointer')} />
  //   </div>
  // );
};

export const CardMenu: FC<any> = () => {
  const { tx } = useThemeContext();
  return <div className={tx('card.root', 'card', {}, classNames)}>{children}</div>
  // return (
  //   <div className={'flex shrink-0 mx-1 w-6 h-6 justify-center items-center'}>
  //     <DotsThreeVertical className={tx(getSize(5), 'outline-none cursor-pointer')} />
  //   </div>
  // );
};

export const Card = {
  Root: CardRoot,
  Header: CardHeader,
  Handle: CardHandle,
  Menu: CardMenu,
  Title: CardTitle,
  Body: CardBody,
};

export type {
  CardRootProps
}
