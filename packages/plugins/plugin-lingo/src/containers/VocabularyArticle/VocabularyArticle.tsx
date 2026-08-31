//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { WordList } from '#components';
import { meta } from '#meta';
import { type Vocabulary, Word } from '#types';

import { useDeckWords } from '../useDeckWords';

/** Row order; `due` and `weakest` are what a learner actually wants before a drill. */
const ORDERS = [
  { value: 'deck', icon: 'ph--list--regular' },
  { value: 'due', icon: 'ph--clock--regular' },
  { value: 'weakest', icon: 'ph--trend-down--regular' },
] as const;

type Order = (typeof ORDERS)[number]['value'];

export type VocabularyArticleProps = AppSurface.ObjectArticleProps<Vocabulary.Vocabulary>;

/** Deck contents: every word with its translation and drill progress. */
export const VocabularyArticle = ({ role, subject, attendableId }: VocabularyArticleProps) => {
  // `Menu.Toolbar` gates itself on `useAttention(attendableId)`, so without an id the toolbar is
  // permanently disabled; fall back to the subject's URI when the surface supplies none.
  const attentionId = attendableId ?? Obj.getURI(subject);
  const words = useDeckWords(subject);
  const [order, setOrder] = useState<Order>('deck');

  const sorted = useMemo(() => sortWords(words, order), [words, order]);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .group(
          'order',
          {
            variant: 'toggleGroup',
            selectCardinality: 'single',
            value: order,
            label: ['order.label', { ns: meta.profile.key }],
          },
          (group) => {
            ORDERS.forEach(({ value, icon }) => {
              group.action(value, { label: [`order-${value}.label`, { ns: meta.profile.key }], icon }, () =>
                setOrder(value),
              );
            });
          },
        )
        .build(),
    [order],
  );

  return (
    <Menu.Root {...menuActions} attendableId={attentionId}>
      <Panel.Root role={role}>
        <Panel.Toolbar asChild classNames='dx-container'>
          <Menu.Toolbar>
            <Menu.Items />
          </Menu.Toolbar>
        </Panel.Toolbar>
        <Panel.Content classNames='dx-container'>
          <WordList words={sorted} />
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

VocabularyArticle.displayName = 'VocabularyArticle';

/** Sorts a copy: the deck's own array is the persisted order and must not be mutated here. */
const sortWords = (words: Word.Word[], order: Order): Word.Word[] => {
  switch (order) {
    case 'due': {
      const now = new Date();
      return [...words].sort((a, b) => Number(Word.isDue(b, now)) - Number(Word.isDue(a, now)));
    }
    case 'weakest':
      return [...words].sort((a, b) => (Word.getScore(a) ?? 0) - (Word.getScore(b) ?? 0));
    default:
      return words;
  }
};
