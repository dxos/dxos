//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { IconButton, Input, type ThemedClassName, Toolbar, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type PopupProps = ThemedClassName<{
  onAdd?: () => Promise<string | null>;
  onSearch?: (text: string) => Promise<string | null>;
  onLaunch?: () => void;
}>;

export const Popup = ({ classNames, onAdd, onSearch, onLaunch }: PopupProps) => {
  const { t } = useTranslation('composer');
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    const str = text.trim();
    if (str.length > 0) {
      const result = await onSearch?.(text);
      if (result) {
        setResult(result);
      }
    }

    inputRef.current?.focus();
  }, [text, onSearch]);

  const handleAdd = useCallback(async () => {
    const result = await onAdd?.();
    if (result) {
      setResult(result);
    }

    inputRef.current?.focus();
  }, [text, onAdd]);

  return (
    <div className={mx('flex flex-col gap-2 bg-baseSurface', classNames)}>
      <Toolbar.Root classNames='gap-2'>
        <IconButton icon='ph--arrow-square-out--regular' iconOnly label={t('button.launch')} onClick={onLaunch} />
        <Input.Root>
          <Input.TextInput
            ref={inputRef}
            autoFocus
            placeholder={t('input.placeholder')}
            value={text}
            onChange={(ev) => setText(ev.target.value)}
            onKeyDown={(ev) => ev.key === 'Enter' && handleSearch()}
          />
        </Input.Root>
        <IconButton icon='ph--plus--regular' iconOnly label={t('button.add')} onClick={handleAdd} />
      </Toolbar.Root>
      {result && <div className='p-2'>{result}</div>}
    </div>
  );
};
