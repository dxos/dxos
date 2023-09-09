//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass } from '@phosphor-icons/react';
import React, { FC, useRef, useState } from 'react';

import { Button, Input, Toolbar, useTranslation } from '@dxos/aurora';
import { getSize, inputSurface, mx } from '@dxos/aurora-theme';

import { SEARCH_PLUGIN } from '../../types';

export type SearchbarProps = {
  onSearch?: (text: string) => void;
};

export const Searchbar: FC<SearchbarProps> = ({ onSearch }) => {
  const { t } = useTranslation(SEARCH_PLUGIN);
  const [text, setText] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const handleChange = (text: string) => {
    setText(text);
    onSearch?.(text);
  };
  const handleClick = () => {
    onSearch?.(text);
    ref.current?.focus();
  };

  return (
    <Toolbar.Root classNames={mx(inputSurface)}>
      <Input.Root>
        <Input.TextInput
          ref={ref}
          variant={'subdued'}
          classNames={'px-3'}
          placeholder={t('search input placeholder')}
          value={text}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={(event) =>
            (event.key === 'Enter' && handleClick()) || (event.key === 'Escape' && handleChange(''))
          }
        />
        <Button variant='ghost' onClick={handleClick}>
          <MagnifyingGlass className={getSize(6)} />
        </Button>
      </Input.Root>
    </Toolbar.Root>
  );
};
