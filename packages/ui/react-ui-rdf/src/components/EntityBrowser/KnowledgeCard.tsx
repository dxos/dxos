//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import * as Card from '@dxos/react-ui/Card';

import { EntityCardField } from './EntityCard.tsx';

export type KnowledgeCardRow = {
  label: string;
  value: ReactNode;
};

export type KnowledgeCardProps = {
  icon: string;
  title: ReactNode;
  /** Beside the title in the card's end column (e.g. a provenance tag), so every card's tags line up. */
  trailing?: ReactNode;
  rows: readonly KnowledgeCardRow[];
  /** After the rows, the card's full width (e.g. the raw TriG). */
  children?: ReactNode;
  testId?: string;
  /** Data attributes a test reads (e.g. a goal's status). */
  data?: Readonly<Record<`data-${string}`, string>>;
  /** The card is the chosen one of its set. */
  selected?: boolean;
  /** Makes the card selectable. */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
};

/** One item as a read-only form: an icon, title and trailing cell head the card, its key/value rows follow. */
export const KnowledgeCard = ({
  icon,
  title,
  trailing,
  rows,
  children,
  testId,
  data,
  selected,
  onClick,
}: KnowledgeCardProps) => (
  <Card.Root grid selected={selected} onClick={onClick} data-testid={testId} {...data}>
    <Card.Row icon={icon} trailing={trailing}>
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
