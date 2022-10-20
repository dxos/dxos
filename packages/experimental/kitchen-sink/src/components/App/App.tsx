//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Party } from '@dxos/client';
import { ItemID } from '@dxos/protocols';
import { ExportAction, execSelection, itemAdapter, usePartyBuilder } from '@dxos/react-client-testing';
import { FullScreen } from '@dxos/react-components';
import { useGraphModel } from '@dxos/react-echo-graph';

import { useQuery } from '../../data'; // TODO(burdon): Pass into App.
import { AppBar } from '../AppBar';
import { CreateItemButton } from '../CreateItem';
import { ThemeProvider } from '../Theme';
import { ViewContainer, ViewType } from '../View';

interface AppProps {
  party: Party
  onInvite?: () => void
  onExport?: (action: ExportAction) => void
}

/**
 * Main application.
 * @param party
 * @param onInvite
 * @param onExport
 * @constructor
 */
export const App = ({
  party,
  onInvite,
  onExport
}: AppProps) => {
  const [view, setView] = useState<string>(ViewType.List);
  const [search, setSearch] = useState<string>('');
  const [selected, setSelected] = useState<Set<ItemID>>(new Set());
  const model = useGraphModel(party, [(item) => Boolean(item.type?.startsWith('example:'))]);
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
      type,
      parent: parentId,
      props: {
        name: title // TODO(burdon): Use adapter.
      }
    });
  };

  const handleSearch = (text: string) => {
    setSearch(text);
  };

  const handleSelection = (text: string) => {
    const selection = execSelection(party, text);
    const result = selection?.exec();
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
          onExport={onExport}
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
