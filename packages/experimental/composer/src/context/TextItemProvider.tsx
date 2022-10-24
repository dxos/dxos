//
// Copyright 2022 DXOS.org
//

import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react';

import type { Item } from '@dxos/client';
import { useSelection } from '@dxos/react-client';
import { Button, Group } from '@dxos/react-ui';
import { TextModel } from '@dxos/text-model';

import { useParty } from './PartyProvider';

export const DOCUMENT_TYPE = 'experimental:type/document';

export interface TextItemContextValue {
  item?: Item<TextModel>
}

export const TextItemContext = createContext<TextItemContextValue>({});

export const TextItemProvider = (props: PropsWithChildren<{}>) => {
  const { party } = useParty();

  const [item, setItem] = useState<Item<TextModel>>();
  const itemSelect = useSelection<Item<TextModel>>(
    party!.database.select({ type: DOCUMENT_TYPE })
  );

  const textModelDocumentContextValue = useMemo(() => ({ item }), [item]);

  const onCreate = useCallback(() => {
    void party!.database
      .createItem({ model: TextModel, type: DOCUMENT_TYPE })
      .then((item) => setItem(item));
  }, [party]);

  const onClose = useCallback(() => setItem(undefined), []);

  return (
    <TextItemContext.Provider value={textModelDocumentContextValue}>
      {item ? (
        <>
          {props.children}
          <Button onClick={onClose} className='fixed bottom-2 left-2'>Close
            document</Button>
        </>
      ) : (
        <Group
          className='my-8 mx-auto w-72 flex flex-col gap-4'
          label={{
            level: 1,
            className: 'text-xl text-center mb-3',
            children: 'Create or select a document'
          }}
        >
          <Button onClick={onCreate} className='width-full'>
            Create new document
          </Button>
          {itemSelect && !!itemSelect.length && <div className='border-b' />}
          {itemSelect?.map((item: Item<TextModel>) => {
            const id = item.id;
            return (
              <Button
                key={id}
                className='width-full truncate'
                onClick={() => setItem(item)}
              >
                {`${id.substring(0, 4)}..${id.substring(id.length - 4, id.length)}`}
              </Button>
            );
          })}
        </Group>
      )}
    </TextItemContext.Provider>
  );
};

export const useTextItem = () => useContext(TextItemContext);
