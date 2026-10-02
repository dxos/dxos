//
// Copyright 2025 DXOS.org
//

import React, { useState } from 'react';

import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import * as Card from '@dxos/react-ui/Card';
import * as ToggleIconButton from '@dxos/react-ui/ToggleIconButton';

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
        <ToggleIconButton.Root
          variant='ghost'
          density='sm'
          icon='ph--caret-right--regular'
          iconOnly
          active={open}
          onClick={() => setOpen(!open)}
          label='Toggle JSON'
        />
      </Card.Block>
      {(open && <JsonHighlighter data={data} classNames='col-span-full max-h-[20lh] py-1.5 text-xs' />) || (
        <Card.Text variant='description'>{collapsedLength}</Card.Text>
      )}
    </Card.Row>
  );
};
