//
// Copyright 2025 DXOS.org
//

import React, { useState } from 'react';

import { Card, ToggleIconButton } from '@dxos/react-ui';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';

export const JsonCard = ({ data }: { data: unknown }) => {
  const [open, setOpen] = useState(false);
  // JSON.stringify throws on circular references / unsupported values (e.g. BigInt); keep the card stable.
  let collapsedLength = 0;
  try {
    collapsedLength = JSON.stringify(data)?.length ?? 0;
  } catch {}
  return (
    <Card.Row>
      <Card.Block classNames='self-start'>
        <ToggleIconButton
          variant='ghost'
          density='sm'
          icon='ph--caret-right--regular'
          iconOnly
          active={open}
          onClick={() => setOpen(!open)}
          label='Toggle JSON'
        />
      </Card.Block>
      {(open && (
        // `Syntax.*` rather than a bare `JsonHighlighter`: the highlighter renders inline and does
        // not scroll, so overflowing it falls back to the platform's own scrollbars. The viewport is
        // a `ScrollArea`, which is where the themed thin scrollbar comes from.
        <Syntax.Root data={data}>
          <Syntax.Content classNames='col-span-full p-0'>
            <Syntax.Viewport classNames='max-h-[20lh]'>
              <Syntax.Code classNames='py-1.5 text-xs' />
            </Syntax.Viewport>
          </Syntax.Content>
        </Syntax.Root>
      )) || <Card.Text variant='description'>{collapsedLength}</Card.Text>}
    </Card.Row>
  );
};
