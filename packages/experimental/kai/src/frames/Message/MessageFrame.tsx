//
// Copyright 2023 DXOS.org
//

import { useQuery } from '@dxos/react-client';
import { Table } from '@dxos/react-components';

import { useAppRouter } from '../../hooks';
import { Message } from '../../proto';

const columns = [];

export const MessageFrame = () => {
  const { space } = useAppRouter();
  const messages = useQuery(space, Message.filter());

  console.log(messages);

  return (
    <div>
      <Table
        columns={columns}
        data={messages}
        // TODO(burdon): Standardize.
        slots={{
          header: { className: 'bg-paper-1-bg' },
          row: { className: 'hover:bg-selection-hover odd:bg-table-rowOdd even:bg-table-rowEven' }
        }}
      />
    </div>
  );
};

export default MessageFrame;
