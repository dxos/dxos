//
// Copyright 2023 DXOS.org
//

import { sentenceCase } from 'change-case';
import { format } from 'date-fns/format';
import { formatDistance } from 'date-fns/formatDistance';
import React, { type FC, type ReactNode } from 'react';

import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

// TODO(burdon): Factor out styles.
const styles = {
  key: 'text-mono text-green-500',
  unit: 'text-sm text-neutral-400 ml-1',
};

export type PropertiesSchema = {
  [key: string]: {
    format: (value: any) => ReactNode;
  };
};

export const PropertySchemaFormat = {
  key: () => ({ format: (value: PublicKey) => <span className={styles.key}>{value.truncate()}</span> }),
  number: (unit?: string) => ({
    format: (value: number) => (
      <>
        <span>{value?.toLocaleString()}</span>
        <span className={styles.unit}>{unit}</span>
      </>
    ),
  }),
  unit: (unit: string, precision = 2) => ({
    format: (value: number) => {
      const e = Math.floor(Math.log(value) / Math.log(1024));
      return (
        <>
          <span>{(value / Math.pow(1024, e)).toFixed(precision)}</span>
          <span className={styles.unit}>{(e > 0 ? 'kMGTP'.charAt(e - 1) : '') + unit}</span>
        </>
      );
    },
  }),
  percent: (precision = 0) => ({
    format: (value: number) => (
      <>
        <span>{value?.toFixed(precision)}</span>
        <span className={styles.unit}>%</span>
      </>
    ),
  }),
  date: (options: { format?: string; relative?: boolean } = {}) => ({
    format: (value: Date | string | number) => {
      const date = value instanceof Date ? value : new Date(value);
      const parts = [];
      if (options.format) {
        parts.push(format(date, options.format));
      }
      if (options.relative) {
        parts.push(formatDistance(date, Date.now(), { addSuffix: true }));
      }
      if (parts.length === 0) {
        parts.push(date.toISOString());
      }

      return (
        <>
          <span>{parts[0]}</span>
          {parts.length > 1 && <span className={styles.unit}>({parts[1]})</span>}
        </>
      );
    },
  }),
};

export type PropertiesSlots = {
  key?: {
    className?: string;
  };
};

export const defaultSlots: PropertiesSlots = {
  key: {
    className: 'pli-4 align-baseline text-neutral-500 overflow-hidden w-40 text-sm',
  },
};

export const PropertiesTable: FC<{
  schema?: PropertiesSchema;
  object: Record<string, any>;
  slots?: PropertiesSlots;
}> = ({ schema, object, slots = defaultSlots }) => {
  const format = (key: string, value: any) => {
    try {
      return schema?.[key]?.format(value) ?? String(value);
    } catch (err) {
      log.catch(err);
      return '<error>';
    }
  };

  return (
    <table className='table-fixed border-collapse'>
      <tbody>
        {Object.entries(object).map(([key, value]) => (
          <tr key={key} className='align-baseline leading-6'>
            <td className={slots?.key?.className}>{sentenceCase(key).toLowerCase()}</td>
            <td>
              <div className='font-mono'>{format(key, value)}</div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
