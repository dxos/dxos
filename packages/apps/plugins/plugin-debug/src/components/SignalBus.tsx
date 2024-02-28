import { SignalBusContext } from '@braneframe/plugin-script';
import { useContext, useEffect, useState } from 'react';
import { raise } from '@dxos/debug';
import { createColumnBuilder, Table, type TableColumnDef, textPadding } from '@dxos/react-ui-table';
import { type Signal } from '@dxos/functions';
import React from 'react';
import { PublicKey } from '@dxos/keys';
import { Select } from '@dxos/react-ui';
import { humanize } from '@dxos/util';
import { useClient } from '@dxos/react-client';
import { Json } from './Tree';

const { helper, builder } = createColumnBuilder<Signal>();
const columns: TableColumnDef<Signal, any>[] = [
  // prettier, no
  helper.accessor('id', builder.string({ header: 'id' })),
  helper.accessor('kind', builder.string({ header: 'kind' })),
];

export const SignalBus = () => {
  const client = useClient();
  const { getBus } = useContext(SignalBusContext) ?? raise(new Error('SignalBusContext not found'));
  const [selectedSpace, setSelectedSpace] = useState<PublicKey>(client.spaces.default.key);
  const signalBus = getBus(client.spaces.get(selectedSpace)!);

  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    signalBus.subscribe((signal) => {
      setSignals((prev) => [...prev, signal]);
    });
  }, [signalBus]);

  // TESTING
  useEffect(() => {
    setInterval(() => {
      signalBus.emit({
        id: 'test',
        kind: 'echo-mutation',
        metadata: {
          created: Date.now(),
          source: 'test',
        },
        data: {
          type: 'test',
          value: 'test',
        },
      });
    }, 500);
  }, [signalBus]);

  return (
    <>
      <PublicKeySelector
        placeholder='Select space'
        keys={client.spaces.get().map((space) => space.key)}
        value={selectedSpace}
        onChange={setSelectedSpace}
        getLabel={(key) => client.spaces.get(key)?.properties.name ?? humanize(key)}
      />
      <div className='divide-y border-neutral-500'>
        {signals.map((signal) => (
          <Json key={signal.id} data={signal} theme='light' />
        ))}
      </div>
      {/* <Table<Signal> columns={columns} data={signals} /> */}
    </>
  );
};

// TODO(dmaretskyi): Extact.
type PublicKeySelectorProps = {
  placeholder: string;
  keys: PublicKey[];
  value?: PublicKey;
  getLabel?: (key: PublicKey) => string;
  onChange?: (key: PublicKey) => any;
};

export const PublicKeySelector = ({
  placeholder,
  getLabel = humanize,
  keys,
  value,
  onChange,
}: PublicKeySelectorProps) => {
  return (
    <Select.Root
      value={value?.toHex()}
      onValueChange={(id) => {
        id && onChange?.(PublicKey.fromHex(id));
      }}
    >
      <Select.TriggerButton placeholder={placeholder} />
      <Select.Portal>
        <Select.Content>
          <Select.Viewport>
            {removeDuplicates(keys).map((key) => (
              <Select.Option key={key.toHex()} value={key.toHex()}>
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-neutral-250'>{key.truncate()}</span>
                  {getLabel(key)}
                </div>
              </Select.Option>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

// TODO(burdon): Factor out.
const removeDuplicates = (keys: PublicKey[]) =>
  keys.reduce<PublicKey[]>((result, key) => {
    if (key !== undefined && !result.some((existing) => existing.equals(key))) {
      result.push(key);
    }

    return result;
  }, []);
