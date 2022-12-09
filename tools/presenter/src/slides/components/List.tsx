//
// Copyright 2022 DXOS.org
//

import React, { ChangeEvent, KeyboardEvent, FC, useState, useEffect } from 'react';

import * as ReactClientModule from '@dxos/react-client';

// NOTE: Due to ESM.
const { useClient, useSpaces } = ReactClientModule as any;

const ITEM_TYPE = 'demo/task';

export const List: FC<{}> = () => {
  const client = useClient();
  const spaces = useSpaces();
  const [text, setText] = useState<string>('');
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    let off: () => void;
    if (spaces.length) {
      const space = spaces[0];
      const result = space.select({ type: ITEM_TYPE }).exec();
      setItems(result.entities);
      off = result.update.on(() => {
        setItems(result.entities);
      });
    }

    return () => off?.();
  }, [spaces.length]);

  const handleCreateItem = async (title: string) => {
    if (spaces.length) {
      const space = spaces[0];
      const item = await space.database.createItem({ type: ITEM_TYPE });
      await item.model.set('title', title);
    }
  };

  const handleChange = (ev: ChangeEvent<HTMLInputElement>) => {
    setText(ev.target.value);
  };

  const handleKeyDown = (ev: KeyboardEvent<HTMLInputElement>) => {
    switch (ev.key) {
      case 'Enter': {
        const title = text.trim();
        if (title.length) {
          setText('');
          setTimeout(async () => {
            await handleCreateItem(title);
          });
        }
        break;
      }
    }
  };

  // TODO(burdon): Need smaller padding sizes for components vs. slides.
  return (
    <div>
      <ul className='p-1'>
        {items.map((item) => (
          <li key={item.id}>{item.model.get('title')}</li>
        ))}
      </ul>

      <input
        type='text'
        value={text}
        className='p-1'
        autoFocus={true}
        placeholder='Enter text'
        onChange={(ev) => handleChange(ev)}
        onKeyDown={(ev) => handleKeyDown(ev)}
      />
    </div>
  );
};
