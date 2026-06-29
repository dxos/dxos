//
// Copyright 2026 DXOS.org
//

import { Format, Obj } from '@dxos/echo';
import { TypeEnum } from '@dxos/echo/Format';
import { SchemaEx } from '@dxos/effect';
import { formatForDisplay } from '@dxos/react-ui-form';

export type ExportFormat = 'csv' | 'json' | 'xml';

export type ExportColumn = {
  path: SchemaEx.JsonPath;
  title: string;
  type?: TypeEnum;
  format?: Format.TypeFormat;
  referencePath?: SchemaEx.JsonPath;
};

const escapeCsvCell = (value: string): string => {
  // Neutralize spreadsheet formula injection: Excel/Sheets execute cells beginning with
  // =, +, -, or @ even when quoted, so prefix such values with a single quote to keep them inert.
  const sanitized = /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
};

const escapeXmlText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const xmlElementName = (title: string, index: number): string => {
  const sanitized = title.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^(\d)/, '_$1');
  // XML element names must begin with a letter or underscore, so prefix names that would
  // otherwise start with a hyphen (or any other non-letter) to keep the document parseable.
  const safeName = /^[A-Za-z_]/.test(sanitized) ? sanitized : `_${sanitized}`;
  return safeName.replace(/^_+$/, '') !== '' ? safeName : `field_${index}`;
};

/** Resolves a visible column value using the same display rules as the table grid. */
// Tabular exporters only read values by JSON path, so they accept any record rather than a full ECHO object.
export const getExportCellValue = (row: object, column: ExportColumn): string => {
  let value = SchemaEx.getValue(row, column.path);
  if (value == null) {
    return '';
  }

  if (column.format === Format.TypeFormat.Ref && column.referencePath) {
    value = SchemaEx.getValue(value.target, column.referencePath);
    if (value == null) {
      return '';
    }
  }

  return formatForDisplay({
    type: column.type ?? TypeEnum.String,
    format: column.format,
    value,
  });
};

export const exportRowsAsCsv = (rows: readonly object[], columns: readonly ExportColumn[]): string => {
  const header = columns.map((column) => escapeCsvCell(column.title)).join(',');
  const lines = rows.map((row) => columns.map((column) => escapeCsvCell(getExportCellValue(row, column))).join(','));
  return [header, ...lines].join('\n');
};

export const exportRowsAsJson = (rows: readonly Obj.Unknown[]): string =>
  JSON.stringify(
    {
      version: 1,
      timestamp: new Date().toISOString(),
      objects: rows.map((row) => Obj.toJSON(row)),
    },
    null,
    2,
  );

export const exportRowsAsXml = (rows: readonly object[], columns: readonly ExportColumn[]): string => {
  const rowMarkup = rows
    .map((row) => {
      const fields = columns
        .map((column, index) => {
          const name = xmlElementName(column.title, index);
          const value = escapeXmlText(getExportCellValue(row, column));
          return `    <${name}>${value}</${name}>`;
        })
        .join('\n');
      return `  <row>\n${fields}\n  </row>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rows>\n${rowMarkup}\n</rows>\n`;
};

export const exportRows = (
  format: ExportFormat,
  rows: readonly Obj.Unknown[],
  columns: readonly ExportColumn[],
): { content: string; mimeType: string; filename: string } => {
  switch (format) {
    case 'csv':
      return {
        content: exportRowsAsCsv(rows, columns),
        mimeType: 'text/csv;charset=utf-8',
        filename: 'table-export.csv',
      };
    case 'json':
      return {
        content: exportRowsAsJson(rows),
        mimeType: 'application/json;charset=utf-8',
        filename: 'table-export.dx.json',
      };
    case 'xml':
      return {
        content: exportRowsAsXml(rows, columns),
        mimeType: 'application/xml;charset=utf-8',
        filename: 'table-export.xml',
      };
  }
};
