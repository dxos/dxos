//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useMemo, useState } from 'react';

import { Form } from '@dxos/react-ui-form';
import * as Card from '@dxos/react-ui/Card';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { AgentNamespace } from '../../namespace.ts';
import { EntityCardField } from './EntityCard.tsx';

//
// Stack
//

export type KnowledgeStackProps<T> = {
  items: readonly T[];
  getId: (item: T) => string;
  /** The text a filter matches, case-insensitively (a title, its key values). */
  getText: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Shown above the cards, unfiltered (e.g. the raw view's prefixes). */
  before?: ReactNode;
};

/**
 * One knowledge tab: a filter in its header over a scrolling stack of cards, as the entity browser's columns are, laid
 * out in the form's frame so the cards read as the forms beside them.
 */
export const KnowledgeStack = <T,>({ items, getId, getText, renderItem, before }: KnowledgeStackProps<T>) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  const [filter, setFilter] = useState('');
  const visible = useMemo(() => {
    const text = filter.trim().toLowerCase();
    return text ? items.filter((item) => getText(item).toLowerCase().includes(text)) : items;
  }, [items, getText, filter]);

  return (
    <Panel.Body asChild>
      <Panel.Root data-testid='agent-knowledge-stack'>
        <Panel.Header>
          <Toolbar.Root>
            <Field.Root>
              <Input.Root
                placeholder={t('entity-browser-filter.placeholder')}
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </Field.Root>
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body asChild>
          <Form.Viewport scroll>
            <Layout.Container gutter='inherit' gap='sm'>
              {before}
              {/* Only a filter that hides every item says so; a stack with nothing to show (the raw view) stays bare. */}
              {items.length > 0 && visible.length === 0 ? (
                <Status.Empty>{t('agent-knowledge-filter-empty.message')}</Status.Empty>
              ) : (
                visible.map((item) => <React.Fragment key={getId(item)}>{renderItem(item)}</React.Fragment>)
              )}
            </Layout.Container>
          </Form.Viewport>
        </Panel.Body>
      </Panel.Root>
    </Panel.Body>
  );
};

//
// Card
//

export type KnowledgeCardRow = {
  label: string;
  value: ReactNode;
};

export type KnowledgeCardProps = {
  icon: string;
  title: ReactNode;
  rows: readonly KnowledgeCardRow[];
  /** After the rows, the card's full width (e.g. the raw TriG). */
  children?: ReactNode;
  testId?: string;
  /** Data attributes a test reads (e.g. a goal's status). */
  data?: Readonly<Record<`data-${string}`, string>>;
};

/** One item as a read-only form: an icon and title head the card, its key/value rows follow. */
export const KnowledgeCard = ({ icon, title, rows, children, testId, data }: KnowledgeCardProps) => (
  <Card.Root grid data-testid={testId} {...data}>
    <Card.Row icon={icon} align='start'>
      <Card.Text lines={3}>{title}</Card.Text>
    </Card.Row>
    {rows.map(({ label, value }, index) => (
      // A key can repeat (a goal's several watches), so the position keeps rows distinct.
      <Card.Row key={`${label}:${index}`}>
        <EntityCardField label={label}>{value}</EntityCardField>
      </Card.Row>
    ))}
    {children}
  </Card.Root>
);
