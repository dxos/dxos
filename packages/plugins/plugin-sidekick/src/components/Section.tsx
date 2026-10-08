//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import * as Layout from '@dxos/react-ui/Layout';

export type SectionProps = PropsWithChildren<{
  title: ReactNode;
}>;

/**
 * Plain titled section used by the sidekick surfaces. These are display panels, not forms,
 * so they deliberately avoid `Form.FieldSet` (which requires a surrounding `Form` context).
 */
export const Section = ({ title, children }: SectionProps) => (
  <Layout.Flex column classNames='py-form-section-gap first:pt-0'>
    <h2 className='text-lg'>{title}</h2>
    {children}
  </Layout.Flex>
);
