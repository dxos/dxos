//
// Copyright 2024 DXOS.org
//

import { format as formatDate } from 'date-fns/format';

import { FormatEnum, GeoLocation, TypeEnum } from '@dxos/echo/internal';

type ValueFormatProps = {
  type: TypeEnum;
  format?: FormatEnum | undefined;
  value: any;
  locale?: string | undefined;
};

/**
 * Format value by type.
 * Used by Table, Sheet, etc.
 */
// TODO(burdon): Move to react-ui-form.
// TODO(burdon): Formatting is different from kind format (e.g., percent is not a data format).
export const formatForDisplay = ({ type, format, value, locale = undefined }: ValueFormatProps): string => {
  const formatScalar = (type: TypeEnum) => {
    switch (type) {
      case TypeEnum.Boolean:
        return (value as boolean).toLocaleString().toUpperCase();
      case TypeEnum.Number:
        return value.toLocaleString(locale);
      case TypeEnum.String:
      case TypeEnum.Ref:
        return String(value);

      default: {
        return String(value);
      }
    }
  };

  if (!format) {
    return formatScalar(type);
  }

  switch (format) {
    case FormatEnum.Boolean: {
      return formatScalar(TypeEnum.Boolean);
    }
    case FormatEnum.Number: {
      return formatScalar(TypeEnum.Number);
    }
    case FormatEnum.String:
    case FormatEnum.Ref: {
      return formatScalar(TypeEnum.String);
    }
    case FormatEnum.Percent: {
      return `${(value as number) * 100}%`;
    }
    case FormatEnum.Currency: {
      // TODO(burdon): Get from property annotation.
      return (value as number).toLocaleString(locale, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    case FormatEnum.Date: {
      try {
        return formatDate(new Date(value as number), 'yyyy-MM-dd');
      } catch (error) {
        return 'Invalid Date';
      }
    }
    case FormatEnum.Time: {
      try {
        return formatDate(new Date(value as number), 'HH:mm:ss');
      } catch (error) {
        return 'Invalid Time';
      }
    }
    case FormatEnum.DateTime: {
      try {
        return formatDate(new Date(value as number), 'yyyy-MM-dd HH:mm:ss');
      } catch (error) {
        return 'Invalid DateTime';
      }
    }
    case FormatEnum.GeoPoint: {
      if (value === null || value === undefined) {
        return '';
      }

      // For GeoPoint format [longitude, latitude].
      if (Array.isArray(value) && value.length >= 2 && value.every(Number.isFinite)) {
        const { latitude, longitude } = GeoLocation.fromGeoPoint(value as [number, number]);
        return `${latitude},${longitude}`;
      }

      return String(value);
    }
    default: {
      if (value === null || value === 'undefined') {
        return '';
      }
      return String(value);
    }
  }
};

export const formatForEditing = ({ type, format, value, locale = undefined }: ValueFormatProps): string => {
  const formatScalar = (type: TypeEnum) => {
    switch (type) {
      case TypeEnum.Boolean:
      case TypeEnum.Number:
      case TypeEnum.String:
      case TypeEnum.Ref:
        return String(value);

      default:
        return String(value);
    }
  };

  if (!format) {
    return formatScalar(type);
  }

  switch (format) {
    case FormatEnum.Boolean:
    case FormatEnum.Number:
    case FormatEnum.String:
    case FormatEnum.Ref: {
      return formatScalar(type);
    }
    case FormatEnum.Percent: {
      return String(value * 100);
    }
    case FormatEnum.Currency: {
      return String(value);
    }
    case FormatEnum.DateTime: {
      const date = new Date(value as number);
      return date.toISOString();
    }
    case FormatEnum.Date: {
      const date = new Date(value as number);
      return date.toISOString().split('T')[0];
    }
    case FormatEnum.Time: {
      const date = new Date(value as number);
      return date.toISOString().split('T')[1].split('.')[0];
    }
    case FormatEnum.GeoPoint: {
      // Handle null or undefined
      if (value === null || value === undefined) {
        return '';
      }

      // For GeoPoint format [longitude, latitude].
      if (Array.isArray(value) && value.length >= 2 && value.every(Number.isFinite)) {
        const { latitude, longitude } = GeoLocation.fromGeoPoint(value as [number, number]);
        return `${latitude},${longitude}`;
      }

      return String(value);
    }

    default: {
      return String(value);
    }
  }
};
