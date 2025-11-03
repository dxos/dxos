//
// Copyright 2025 DXOS.org
//

export type Unit = {
  symbol: string;
  quotient: number;
  precision?: number;
};

export type UnitValue<T> = {
  unit: Unit;
  value: number;
  formattedValue: T;
  toString: () => string;
};

export type UnitFormat<T = any> = (n: number, precision?: number) => UnitValue<T>;

const createFormat =
  (unit: Unit): UnitFormat<string> =>
  (n: number, precision = unit.precision ?? 0) => {
    const value = n / unit.quotient;
    return {
      unit,
      value,
      formattedValue: value.toFixed(precision),
      toString: () => `${value.toFixed(precision)}${unit.symbol}`,
    };
  };

const MS_SECONDS = 1_000;
const MS_MINUTES = 60 * MS_SECONDS;
const MS_HOURS = 60 * MS_MINUTES;

export const Unit: Record<string, UnitFormat> = {
  // General.
  Percent: createFormat({ symbol: '%', quotient: 1 / 100, precision: 2 }),
  Thousand: createFormat({ symbol: 'k', quotient: 1_000, precision: 2 }),

  // Bytes (note KB vs KiB).
  Gigabyte: createFormat({ symbol: 'GB', quotient: 1_000 * 1_000 * 1_000, precision: 2 }),
  Megabyte: createFormat({ symbol: 'MB', quotient: 1_000 * 1_000, precision: 2 }),
  Kilobyte: createFormat({ symbol: 'KB', quotient: 1_000, precision: 2 }),

  // Time.
  Hour: createFormat({ symbol: 'h', quotient: MS_HOURS }),
  Minute: createFormat({ symbol: 'm', quotient: MS_MINUTES }),
  Second: createFormat({ symbol: 's', quotient: MS_SECONDS, precision: 1 }),
  Millisecond: createFormat({ symbol: 'ms', quotient: 1 }),
  Duration: (n: number) => {
    const hours = Math.floor(n / MS_HOURS);
    const minutes = Math.floor((n % MS_HOURS) / MS_MINUTES);
    if (hours) {
      const formattedValue = minutes ? `${hours}h ${minutes}m` : `${hours}h`;
      return {
        unit: { symbol: 'h', quotient: MS_HOURS },
        value: hours,
        formattedValue,
        toString: () => formattedValue,
      };
    }

    if (minutes) {
      const seconds = (n - MS_MINUTES * minutes) / MS_SECONDS;
      const formattedValue = seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
      return {
        unit: { symbol: 'm', quotient: MS_MINUTES },
        value: minutes,
        formattedValue,
        toString: () => formattedValue,
      };
    }

    const seconds = n >= MS_SECONDS;
    if (seconds) {
      return Unit.Second(n);
    }

    return Unit.Millisecond(n);
  },
} as const;
