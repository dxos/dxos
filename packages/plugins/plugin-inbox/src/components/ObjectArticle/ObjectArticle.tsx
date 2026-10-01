//
// Copyright 2026 DXOS.org
//

import React, { type ComponentProps, type ReactNode } from 'react';

import { Next } from '@dxos/react-ui/next';

export type ObjectArticleProps = {
  role?: ComponentProps<typeof Next.Panel.Root>['role'];
  /** Toolbar element rendered in the panel toolbar slot (slotted via `asChild`). */
  toolbar: ReactNode;
  /** Header element rendered above the body (typically `Header.Root`). */
  header: ReactNode;
  /** Body region (the article content beneath the header). */
  children: ReactNode;
};

/**
 * Shared object-article scaffold: a `dx-document` Panel with a toolbar, a header, and a body laid out as
 * `auto · 1fr`. Used by the Event and Message article containers so both share one layout.
 */
export const ObjectArticle = ({ role, toolbar, header, children }: ObjectArticleProps) => (
  <Next.Panel.Root role={role} width='document'>
    <Next.Panel.Header>{toolbar}</Next.Panel.Header>
    <Next.Panel.Body classNames='grid grid-rows-[auto_1fr]'>
      {header}
      {children}
    </Next.Panel.Body>
  </Next.Panel.Root>
);
