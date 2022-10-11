//
// Copyright 2022 DXOS.org
//

import React, { createContext, PropsWithChildren, useMemo, useState, useEffect, useContext } from 'react';

import { Item } from '@dxos/client';
import { useClient } from '@dxos/react-client';
import { Loading } from '@dxos/react-ui';
import { TextModel } from '@dxos/text-model';

import { useParty } from './PartyProvider';

export const DOCUMENT_TYPE = 'example:type/document';

export interface TextModelDocumentContextValue {
  item?: Item<TextModel>
}

export const TextModelDocumentContext = createContext<TextModelDocumentContextValue>({});

export const TextModelDocumentProvider = (props: PropsWithChildren<{}>) => {
  const client = useClient();
  const { party } = useParty();

  const [item, setItem] = useState<Item<TextModel>>();

  useEffect(() => {
    if (client && party && !item) {
      client.echo.registerModel(TextModel);
      void party.database.createItem({ model: TextModel, type: DOCUMENT_TYPE }).then(item => setItem(item));
    }
  }, [client, party, item]);

  const textModelDocumentContextValue = useMemo(() => ({ item }), [item]);

  return (
    <TextModelDocumentContext.Provider value={textModelDocumentContextValue}>
      {item ? props.children : <Loading />}
    </TextModelDocumentContext.Provider>
  );
};

export const useTextModelDocument = () => useContext(TextModelDocumentContext);
