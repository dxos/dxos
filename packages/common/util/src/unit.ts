//
// Copyright 2025 DXOS.org
//

type Unit = {
  symbol: string;
  quotient: number;
};

type Format = (n: number, precision?: number) => string;

const Formatter = (unit: Unit): Format => {
  return (n: number, precision = 2) => {
    const value = n / unit.quotient;
    return `${value.toFixed(precision)}${unit.symbol}`;
  };
};

export const Unit = {
  // ms.
  Hour: Formatter({ symbol: 'h', quotient: 60 * 60 * 1_000 }),
  Minute: Formatter({ symbol: 'm', quotient: 60 * 1_000 }),
  Second: Formatter({ symbol: 's', quotient: 1_000 }),
  Millisecond: Formatter({ symbol: 'ms', quotient: 1 }),
  Duration: (n: number) => {
    const hours = Math.floor(n / (60 * 60 * 1_000));
    const minutes = Math.floor((n % (60 * 60 * 1_000)) / (60 * 1_000));
    if (hours) {
      return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
    }

    const seconds = Math.floor((n % (60 * 1_000)) / 1_000);
    if (minutes) {
      return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }

    if (seconds) {
      return `${(n / 1_000).toFixed(1)}s`;
    }

    return `${n}ms`;
  },

  // bytes (note KB via KiB).
  Gigabyte: Formatter({ symbol: 'GB', quotient: 1_000 * 1_000 * 1_000 }),
  Megabyte: Formatter({ symbol: 'MB', quotient: 1_000 * 1_000 }),
  Kilobyte: Formatter({ symbol: 'KB', quotient: 1_000 }),

  // general.
  Thousand: Formatter({ symbol: 'k', quotient: 1_000 }),
  Percent: Formatter({ symbol: '%', quotient: 1 / 100 }),
};
