import { text, defineTemplate } from "@dxos/plate";
import config from "../config.t";

export default defineTemplate(({ input })=> {
  const { tailwind } = input;
  return !tailwind ? null : text`
  {
    "recommendations": [
      "csstools.postcss",
      "bradlc.vscode-tailwindcss"
    ]
  }
  `
}, { config});