//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Party } from '@dxos/client';
import { ItemID } from '@dxos/echo-protocol';
import { ObjectModel } from '@dxos/object-model';
import { FullScreen } from '@dxos/react-components';

import { execSelection, ThemeProvider, usePartyBuilder } from '../../../src';
import { useGraphModel, useQuery } from '../data';
import { itemAdapter } from '../testing';
import { AppBar } from './AppBar';
import { CreateItemButton } from './CreateItemButton';
import { ViewContainer } from './ViewContainer';
import { ViewType } from './ViewSelector';

interface AppProps {
  party: Party
  onInvite?: () => void
}

/**
 * Main application.
 * @param party
 * @param onInvite
 * @constructor
 */
export const App = ({
  party,
  onInvite
}: AppProps) => {
  const [view, setView] = useState<string>(ViewType.List);
  const [search, setSearch] = useState<string>('');
  const [selected, setSelected] = useState<Set<ItemID>>(new Set());
  const model = useGraphModel(party);
  const items = useQuery(party, search);
  const builder = usePartyBuilder(party);

  // Update selection.
  useEffect(() => {
    const selected = new Set<ItemID>();
    if (search.length) {
      items.forEach(item => selected.add(item.id));
    }

    setSelected(selected);
    model.refresh();
    // TODO(burdon): Items.length hack (if just items, then recursion).
  }, [search, items.length]);

  if (!party) {
    return null;
  }

  const handleCreateItem = (type?: string, title?: string, parentId?: ItemID) => {
    if (!type) {
      void builder?.createRandomItem();
      return;
    }

    void party.database.createItem({
      model: ObjectModel, // TODO(burdon): Set as default.
      type,
      parent: parentId,
      props: {
        title
      }
    });
  };

  const handleSearch = (text: string) => {
    setSearch(text);
  };

  const handleSelection = (text: string) => {
    const selection = execSelection(party, text);
    const result = selection?.query();
    const selected = new Set<ItemID>();
    result?.entities.forEach(item => selected.add(item.id));
    setSelected(selected);
    model.refresh();
  };

  return (
    <FullScreen>
      <ThemeProvider>
        <AppBar
          view={view}
          onInvite={onInvite}
          onSearch={handleSearch}
          onSelection={handleSelection}
          onChangeView={(view: string) => setView(view)}
        />

        <ViewContainer
          model={model}
          items={items}
          selected={selected}
          itemAdapter={itemAdapter}
          value={view}
          onCreateItem={handleCreateItem}
        />

        <CreateItemButton
          onCreate={handleCreateItem}
        />
      </ThemeProvider>
    </FullScreen>
  );
};
