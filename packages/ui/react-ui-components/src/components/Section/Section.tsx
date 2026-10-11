//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useId } from 'react';

import { createContext } from '@dxos/react-hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

// A labelled block of a panel (a heading and the list or field beneath it). Sections stack in a
// `Layout.Container gap='lg'`, so the gap between sections exceeds the gap inside one.

//
// Context
//

type ContextValue = {
  labelId: string;
};

const [SectionContext, useSectionContext] = createContext<ContextValue>('Section');

//
// Root
//

const ROOT_NAME = 'Section.Root';

type RootProps = Util.ThemedClassName<PropsWithChildren>;

const Root = ({ classNames, children }: RootProps) => {
  const labelId = useId();
  return (
    <SectionContext labelId={labelId}>
      <Layout.Flex asChild column gap='xs' classNames={classNames}>
        <section aria-labelledby={labelId}>{children}</section>
      </Layout.Flex>
    </SectionContext>
  );
};

Root.displayName = ROOT_NAME;

//
// Label
//

const LABEL_NAME = 'Section.Label';

type LabelProps = Util.ThemedClassName<PropsWithChildren>;

/** Inset by the list row's padding, so the label lines up with the rows' icons. */
const Label = ({ classNames, children }: LabelProps) => {
  const { labelId } = useSectionContext(LABEL_NAME);
  return (
    <h3 id={labelId} className={mx('px-(--dx-control-pad) text-sm text-fg-muted', classNames)}>
      {children}
    </h3>
  );
};

Label.displayName = LABEL_NAME;

//
// Empty
//

const EMPTY_NAME = 'Section.Empty';

type EmptyProps = Util.ThemedClassName<PropsWithChildren>;

/** The placeholder a section shows when its list has no rows. */
const Empty = ({ classNames, children }: EmptyProps) => (
  <p role='status' className={mx('px-(--dx-control-pad) text-sm text-fg-muted', classNames)}>
    {children}
  </p>
);

Empty.displayName = EMPTY_NAME;

//
// Section
//

export const Section = {
  Root,
  Label,
  Empty,
};

export type { EmptyProps as SectionEmptyProps, LabelProps as SectionLabelProps, RootProps as SectionRootProps };
