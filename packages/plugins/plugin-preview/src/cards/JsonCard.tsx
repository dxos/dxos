//
// Copyright 2025 DXOS.org
//

import React, { useState } from 'react';

import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import * as Card from '@dxos/react-ui/Card';
import * as SystemButton from '@dxos/react-ui/SystemButton';

export const JsonCard = ({ data }: { data: unknown }) => {
  const [open, setOpen] = useState(false);
  // JSON.stringify throws on circular references / unsupported values (e.g. BigInt); keep the card stable.
  let collapsedLength = 0;
  try {
    collapsedLength = JSON.stringify(data)?.length ?? 0;
  } catch {}
  return (
    <Card.Row
      align='start'
      leading={
        <SystemButton.Disclosure
          variant='ghost'
          size='sm'
          label='Toggle JSON'
          expanded={open}
          onExpandedChange={setOpen}
        />
      }
    >
      {(open && <JsonHighlighter data={data} classNames='max-h-[20lh] py-1.5 text-xs' />) || (
        <Card.Text variant='muted'>{collapsedLength}</Card.Text>
      )}
    </Card.Row>
  );
};
