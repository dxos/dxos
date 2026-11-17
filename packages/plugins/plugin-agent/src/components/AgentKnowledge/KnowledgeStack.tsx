//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useMemo, useState } from 'react';

import { Form } from '@dxos/react-ui-form';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { AgentNamespace } from '../../namespace.ts';

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
