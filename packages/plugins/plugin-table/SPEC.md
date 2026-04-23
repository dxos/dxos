# plugin-table

Relational database tables with sorting, filtering, and views.

## Status

Stable.

## Description

Creates and manages structured data tables backed by ECHO. Supports custom column types, sorting, filtering, relations between tables, and view-based queries.

## Features

- **Custom columns**: Define typed columns (text, number, date, relation, etc.).
- **Sorting and filtering**: Sort and filter rows by column values.
- **Table relations**: Link rows between tables as foreign key references.
- **Views**: Save named filtered/sorted views of a table.
- **Export**: Export table data to CSV or JSON.
- **Translations**: Localizable UI strings.

## Schema

- `org.dxos.type.table` — Table object with schema and row data (via ECHO view).
