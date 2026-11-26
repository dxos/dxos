//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { Sheet, SheetOperation } from '#types';

const operations = [SheetOperation.Create, SheetOperation.GetValues, SheetOperation.SetValues, SheetOperation.AddChart];

export const key = Sheet.SKILL_KEY;

export const make = () =>
  Skill.make({
    key: Sheet.SKILL_KEY,
    name: 'Sheet',
    tools: Skill.toolDefinitions({ operations }),
    agentCanEnable: true,
    instructions: Template.make({
      source: trim`
        You are an expert at working with spreadsheets.
        The context object represents a Sheet — a collaborative spreadsheet backed by ECHO.

        ## Reading data

        Use the \`${Operation.toolName(SheetOperation.GetValues)}\` tool to read cell values from the sheet.
        It returns a 2D array indexed [row][col] and the A1 range it covers.
        Omit the \`range\` parameter to read the entire occupied area, or pass a range like "A1:C5" to read a subset.

        ## Writing data

        Use \`${Operation.toolName(SheetOperation.SetValues)}\` to write one or more cells at once.
        Pass a map of A1 addresses to values, e.g. \`{ "A1": "Name", "B1": 42, "C1": "=SUM(A1:A5)" }\`.
        Cell values can be plain scalars (string, number, boolean) or formula strings starting with "=".
        Formula examples: "=SUM(A1:A5)", "=A1*B1", "=IF(C2>0,\"yes\",\"no\")".
        Over 400 HyperFormula functions are available: arithmetic, statistical, text, date/time, financial, logical.

        ## Charts

        Use \`${Operation.toolName(SheetOperation.AddChart)}\` to draw a range as a chart; it appears in the sheet's charts
        panel and can be linked into a presentation as a slide. Lay the data out first: a header row with the series
        names, then the category (or x value) in the first column and one numeric column per series, and pass
        \`header: true\`. Types: ${SheetOperation.CHART_TYPES.map((type) => `\`${type}\``).join(', ')}. Use \`bar\` to
        compare categories, \`pie\` for shares of a whole (one series), \`xy\` for a series over time.

      `,
    }),
  });
