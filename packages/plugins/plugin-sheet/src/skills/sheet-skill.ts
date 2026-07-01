//
// Copyright 2025 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { Sheet, SheetOperation } from '#types';

const operations = [SheetOperation.Create, SheetOperation.GetValues, SheetOperation.SetValues];

const make = () =>
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

        Use the \`getValues\` tool to read cell values from the sheet.
        It returns a 2D array indexed [row][col] and the A1 range it covers.
        Omit the \`range\` parameter to read the entire occupied area, or pass a range like "A1:C5" to read a subset.

        ## Writing data

        Use \`setValues\` to write one or more cells at once.
        Pass a map of A1 addresses to values, e.g. \`{ "A1": "Name", "B1": 42, "C1": "=SUM(A1:A5)" }\`.
        Cell values can be plain scalars (string, number, boolean) or formula strings starting with "=".
        Formula examples: "=SUM(A1:A5)", "=A1*B1", "=IF(C2>0,\"yes\",\"no\")".
        Over 400 HyperFormula functions are available: arithmetic, statistical, text, date/time, financial, logical.

      `,
    }),
  });

const skill: Skill.Definition = {
  key: Sheet.SKILL_KEY,
  make,
};

export default skill;
