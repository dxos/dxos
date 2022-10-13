//
// Copyright 2022 DXOS.org
//

import React, {
  createContext,
  PropsWithChildren,
  useMemo,
  useState,
  useContext,
  useCallback,
  useEffect
} from 'react';

import type { Item } from '@dxos/client';
import { useClient, useSelection } from '@dxos/react-client';
import { Group, Button } from '@dxos/react-ui';
import { TextModel } from '@dxos/text-model';

import { useParty } from './PartyProvider';

export const DOCUMENT_TYPE = 'experimental:type/document';

export interface TextItemContextValue {
  item?: Item<TextModel>;
}

export const TextItemContext = createContext<TextItemContextValue>({});

export const TextItemProvider = (props: PropsWithChildren<{}>) => {
  const client = useClient();
  const { party } = useParty();

  const [item, setItem] = useState<Item<TextModel>>();
  const itemSelect = useSelection<Item<TextModel>>(
    party!.database.select({ type: DOCUMENT_TYPE })
  );

  const textModelDocumentContextValue = useMemo(() => ({ item }), [item]);

  useEffect(() => {
    client.echo.registerModel(TextModel);
  }, [client]);

  const onCreate = useCallback(() => {
    void party!.database
      .createItem({ model: TextModel, type: DOCUMENT_TYPE })
      .then((item) => setItem(item));
  }, [party]);

  return (
    <TextItemContext.Provider value={textModelDocumentContextValue}>
      {item ? (
        props.children
      ) : (
        <Group
          className='my-8 mx-auto w-72 flex flex-col'
          label={{
            level: 1,
            className: 'text-xl text-center mb-3',
            children: 'Create or select a document'
          }}
        >
          <Button onClick={onCreate} className='width-full'>
            Create new document
          </Button>
          <div className='' />
          {itemSelect?.map((item: Item<TextModel>) => {
            return (
              <Button
                key={item.id}
                className='width-full truncate'
                onClick={() => setItem(item)}
              >
                {item.id}
              </Button>
            );
          })}
        </Group>
      )}
    </TextItemContext.Provider>
  );
};

export const useTextItem = () => useContext(TextItemContext);
