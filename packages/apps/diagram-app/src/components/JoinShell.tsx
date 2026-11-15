//
// Copyright 2026 DXOS.org
//

import React, { useRef } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Typography from '@dxos/react-ui/Typography';

/**
 * A still copy of Composer's join dialog as it connects, for while no live one is on screen: before the plugins load
 * and after the join, until the joined space opens. It takes no input.
 */
export const JoinShell = () => {
  const container = useRef<HTMLDivElement>(null);
  return (
    <div inert ref={container} className='contents' data-testid='diagram-app.join-shell'>
      <Dialog.Root open modal={false}>
        <Dialog.Content container={container}>
          <Dialog.Header>
            <Dialog.Title>Joining space</Dialog.Title>
            <Button.Root variant='ghost' icon='ph--x--regular' iconOnly label='Exit' />
          </Dialog.Header>
          <Dialog.Body>
            <Typography.Text tone='muted'>Connecting…</Typography.Text>
          </Dialog.Body>
          <Dialog.Footer>
            <Button.Root variant='ghost'>Cancel</Button.Root>
            <Button.Root variant='primary' disabled>
              Next
            </Button.Root>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
};
