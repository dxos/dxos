//
// Copyright 2025 DXOS.org
//

import React, { useState } from 'react';

import { Card, ToggleIconButton } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

export const JsonCard = ({ data }: { data: unknown }) => {
  const [open, setOpen] = useState(false);
  // JSON.stringify throws on circular references / unsupported values (e.g. BigInt); keep the card stable.
  let collapsedLength = 0;
  try {
    collapsedLength = JSON.stringify(data)?.length ?? 0;
  } catch {}
  return (
    <Card.Row>
      <Card.Block>
        <ToggleIconButton
          variant='ghost'
          icon='ph--caret-right--regular'
          iconOnly
          active={open}
          onClick={() => setOpen(!open)}
          label='Toggle JSON'
        />
      </Card.Block>
      {(open && <JsonHighlighter data={data} classNames='py-1.5 col-span-full text-xs overflow-auto' />) || (
        <Card.Text variant='description'>{collapsedLength}</Card.Text>
      )}
    </Card.Row>
  );
};
