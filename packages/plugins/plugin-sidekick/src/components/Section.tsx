//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

export type SectionProps = PropsWithChildren<{
  title: ReactNode;
}>;

/**
 * Plain titled section used by the sidekick surfaces. These are display panels, not forms,
 * so they deliberately avoid `Form.Section` (which requires a surrounding `Form` context).
 */
export const Section = ({ title, children }: SectionProps) => (
  <div className='flex flex-col py-form-section-gap first:pt-0'>
    <h2 className='text-lg'>{title}</h2>
    {children}
  </div>
);
