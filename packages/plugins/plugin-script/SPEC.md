# plugin-script

Custom JavaScript scripting for workspace automation.

## Status

Labs (experimental).

## Description

Allows users to write, edit, and deploy custom JavaScript functions as workspace scripts. Scripts can serve as AI agent tools, spreadsheet formulas, or automation triggers.

## Features

- **Script editor**: Monaco-based JavaScript/TypeScript code editor.
- **Notebook mode**: Cell-based script execution with inline results.
- **AI tool registration**: Expose scripts as tools callable by AI agents.
- **Formula functions**: Register scripts as custom spreadsheet formulas.
- **Deployment**: Bundle and deploy scripts to the DXOS runtime.
- **Translations**: Localizable UI strings.

## Schema

- `org.dxos.type.notebook` — Script notebook with code cells and outputs.
