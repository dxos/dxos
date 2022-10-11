//
// Copyright 2022 DXOS.org
//

import React, { createContext, PropsWithChildren, useMemo, useState, useEffect, useContext } from 'react';

import { useClient } from '@dxos/react-client';
import { Loading } from '@dxos/react-ui';
import { TextModel as NaturalTextModel } from '@dxos/text-model';

import { Party, useParty } from './PartyProvider';

export type TextModel = NaturalTextModel;
export type Item = Awaited<ReturnType<Party['database']['createItem']>>

export const DOCUMENT_TYPE = 'example:type/document';

export interface TextItemContextValue {
  item?: Item
}

export const TextItemContext = createContext<TextItemContextValue>({});

export const TextItemProvider = (props: PropsWithChildren<{}>) => {
  const client = useClient();
  const { party } = useParty();

  const [item, setItem] = useState<Item>();

  useEffect(() => {
    if (client && party && !item) {
      console.log('[register text model]');
      client.echo.registerModel(NaturalTextModel);
      console.log('[create text item]');
      void party.database.createItem({ model: NaturalTextModel, type: DOCUMENT_TYPE }).then(item => setItem(item));
    } else if (item) {
      console.log('[text item]', item);
    }
  }, [client, party, item]);

  const textModelDocumentContextValue = useMemo(() => ({ item }), [item]);

  return (
    <TextItemContext.Provider value={textModelDocumentContextValue}>
      {item ? props.children : <Loading />}
    </TextItemContext.Provider>
  );
};

export const useTextItem = () => useContext(TextItemContext);
