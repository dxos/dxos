//
// Copyright 2025 DXOS.org
//

import React, { useState } from 'react';

import { Block, Card, SystemButton } from '@dxos/react-ui';
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
      <Block classNames='self-start'>
        <SystemButton.Disclosure
          variant='ghost'
          size='sm'
          label='Toggle JSON'
          expanded={open}
          onExpandedChange={setOpen}
        />
      </Block>
      {(open && <JsonHighlighter data={data} classNames='col-span-full max-h-[20lh] py-1.5 text-xs' />) || (
        <Card.Text variant='muted'>{collapsedLength}</Card.Text>
      )}
    </Card.Row>
  );
};
