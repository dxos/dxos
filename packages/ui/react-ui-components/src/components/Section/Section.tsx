//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useId } from 'react';

import { createContext } from '@dxos/react-hooks';
import * as Field from '@dxos/react-ui/Field';
import * as Layout from '@dxos/react-ui/Layout';
import * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

// A labelled block of a panel (a heading and the list beneath it), built like a form field so a hand-built panel reads
// as the forms beside it: the same label row (`Field.Header`), label type and edge. Sections stack in a form's frame
// (`Form.Viewport`, then a `Layout.Container gutter='inherit' gap='sm'` as `Form.Content` lays out its fields).

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
      <Layout.Flex asChild column classNames={classNames}>
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

/**
 * A form field's label row and type, as a heading: it names a list rather than a control, so it is no `<label>`. Flush
 * with the content edge, as a field label is, so a row's text sits as far inside it as a control's text does.
 */
const Label = ({ classNames, children }: LabelProps) => {
  const { labelId } = useSectionContext(LABEL_NAME);
  return (
    <Field.Header>
      <h3 id={labelId} className={mx('dx-label', classNames)}>
        {children}
      </h3>
    </Field.Header>
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
  <p role='status' className={mx('text-sm text-fg-muted', classNames)}>
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
