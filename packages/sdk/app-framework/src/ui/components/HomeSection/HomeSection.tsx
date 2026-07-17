//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, forwardRef } from 'react';

import { SystemIconButton, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

//
// Root
//

type HomeSectionRootProps = ThemedClassName<PropsWithChildren>;

/**
 * Shared container for a Home content section: a centered, max-width column. Home surface
 * contributors (welcome, recent, dashboard, suggestions) render inside one so they share a
 * consistent width and rhythm regardless of which plugin owns them.
 */
const HomeSectionRoot = forwardRef<HTMLDivElement, HomeSectionRootProps>(({ classNames, children }, forwardedRef) => (
  <div ref={forwardedRef} className={mx('flex flex-col w-full mx-auto max-w-[40rem]', classNames)}>
    {children}
  </div>
));

HomeSectionRoot.displayName = 'HomeSection.Root';

//
// Header
//

type HomeSectionHeaderProps = ThemedClassName<
  PropsWithChildren<{
    /** Section heading. */
    title?: string;
    /** When provided, renders a close affordance that hides the section. */
    onClose?: () => void;
  }>
>;

/**
 * Header row for a Home section: a muted title, an optional trailing actions slot (`children`),
 * and an optional close affordance. `children` render before the close button so section-specific
 * controls (e.g. a range selector) sit inline with it.
 */
const HomeSectionHeader = forwardRef<HTMLDivElement, HomeSectionHeaderProps>(
  ({ title, onClose, classNames, children }, forwardedRef) => (
    <div ref={forwardedRef} className={mx('flex items-center gap-2', classNames)}>
      {title && <h2 className='grow truncate text-sm font-medium text-description'>{title}</h2>}
      {!title && <span role='none' className='grow' />}
      {children}
      {onClose && <SystemIconButton.Close variant='ghost' iconOnly onClick={onClose} />}
    </div>
  ),
);

HomeSectionHeader.displayName = 'HomeSection.Header';

//
// HomeSection
//

export const HomeSection = {
  Root: HomeSectionRoot,
  Header: HomeSectionHeader,
};

export type { HomeSectionHeaderProps, HomeSectionRootProps };
