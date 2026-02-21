//
// Copyright 2025 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { Filter, Obj, Query, Type } from '@dxos/echo';
import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { ProjectionModel, View, createEchoChangeCallback } from '@dxos/schema';
import { withRegistry } from '@dxos/storybook-utils';
import { Organization } from '@dxos/types';

import { createEchoChangeCallback as createKanbanChangeCallback } from '../hooks';
import { KanbanCardTileSimple } from '../testing';
import { translations } from '../translations';
import { Kanban } from '../types';

import { KanbanBoard } from './KanbanBoard';

faker.seed(1);

const createOrg = () => ({
  name: faker.commerce.productName(),
  description: faker.lorem.sentence(),
  image: faker.image.url(),
  website: faker.internet.url(),
  status: faker.helpers.arrayElement(Organization.StatusOptions).id as Organization.Organization['status'],
});

/**
 * In-memory Kanban board: View + ProjectionModel + Kanban + items, no plugin manager or Space.
 * Similar to react-ui-kanban Kanban.stories.tsx.
 */
const DefaultStory = () => {
  const registry = useContext(RegistryContext);
  const items = useMemo(() => Atom.make<Obj.Unknown[]>([]), []);
  const [state, setState] = useState<{
    view: View.View;
    kanban: Kanban.Kanban;
    projection: ProjectionModel;
    change: ReturnType<typeof createKanbanChangeCallback>;
  }>();

  useEffect(() => {
    const view = View.make({
      query: Query.select(Filter.typename(Organization.Organization.typename)),
      jsonSchema: Type.toJsonSchema(Organization.Organization),
      pivotFieldName: 'status',
    });
    const kanban = Kanban.make({ view });
    const change = createKanbanChangeCallback(kanban);
    const projection = new ProjectionModel({
      registry,
      view,
      baseSchema: Type.toJsonSchema(Organization.Organization),
      change: createEchoChangeCallback(view),
    });
    projection.normalizeView();

    const statuses = Organization.StatusOptions.map((o) => o.id);
    const initialItems = Array.from({ length: 12 }, () =>
      Obj.make(Organization.Organization, {
        ...createOrg(),
        status: faker.helpers.arrayElement(statuses) as Organization.Organization['status'],
      }),
    );

    setState({ view, kanban, projection, change });
    registry.set(items, initialItems);
  }, [registry, items]);

  const columnFieldPath =
    state?.projection.tryGetFieldProjection(state.projection.getFieldId('status') ?? '')?.props.property ?? 'status';

  const handleCardAdd = useCallback(
    (columnValue: string | undefined) => {
      if (!state || !columnFieldPath || !registry) return undefined;
      const card = Obj.make(Organization.Organization, {
        ...createOrg(),
        ...(columnFieldPath ? { [columnFieldPath]: columnValue } : {}),
      });
      const current = registry.get(items) ?? [];
      registry.set(items, [...current, card]);
      return card.id;
    },
    [state, columnFieldPath, registry, items],
  );

  const handleCardRemove = useCallback(
    (card: Obj.Unknown) => {
      if (!registry) return;
      const current = registry.get(items) ?? [];
      registry.set(
        items,
        current.filter((i) => i.id !== card.id),
      );
    },
    [registry, items],
  );

  if (!state) {
    return <></>;
  }

  return (
    <KanbanBoard.Root
      kanban={state.kanban}
      projection={state.projection}
      items={items}
      itemTile={KanbanCardTileSimple}
      change={state.change}
      onCardAdd={handleCardAdd}
      onCardRemove={handleCardRemove}
    >
      <KanbanBoard.Content />
    </KanbanBoard.Root>
  );
};

const meta = {
  title: 'plugins/plugin-kanban/KanbanBoard',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withMosaic(), withRegistry],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * In-memory board with Echo-shaped objects. No plugin manager, client, or Space.
 */
export const Default: Story = {};
