import { text, defineTemplate } from "@dxos/plate";
import config from "../config.t";

export default defineTemplate(({ input })=> {
  const { dxosUi } = input;
  return !dxosUi ? null : text`
  {
    "recommendations": [
      "bradlc.vscode-tailwindcss"
    ]
  }
  `
}, { config});