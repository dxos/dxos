// From: https://github.com/Menci/vite-plugin-wasm

import fs from "fs";

export interface WasmInfo {
  imports: {
    from: string;
    names: string[];
  }[];
  exports: string[];
}

/// <reference lib="DOM" />

// This file is copied from
// https://github.com/vitejs/vite/blob/3c0a6091fe96044e9dd84fbe5db3343339a88986/packages/vite/src/node/plugins/wasm.ts

export const id = "/__vite-plugin-wasm-helper";

/* istanbul ignore next */
const wasmHelper = async (opts = {}, url: string) => {
  let result: WebAssembly.WebAssemblyInstantiatedSource;
  if (url.startsWith("data:")) {
    const urlContent = url.replace(/^data:.*?base64,/, "");
    let bytes;
    if (typeof Buffer === "function" && typeof Buffer.from === "function") {
      bytes = Buffer.from(urlContent, "base64");
    } else if (typeof atob === "function") {
      const binaryString = atob(urlContent);
      bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
    } else {
      throw new Error("Cannot decode base64-encoded data URL");
    }
    result = await WebAssembly.instantiate(bytes, opts);
  } else {
    // https://github.com/mdn/webassembly-examples/issues/5
    // WebAssembly.instantiateStreaming requires the server to provide the
    // correct MIME type for .wasm files, which unfortunately doesn't work for
    // a lot of static file servers, so we just work around it by getting the
    // raw buffer.
    // @ts-ignore
    const response = await fetch(url);
    const contentType = response.headers.get("Content-Type") || "";
    if ("instantiateStreaming" in WebAssembly && contentType.startsWith("application/wasm")) {
      result = await WebAssembly.instantiateStreaming(response, opts);
    } else {
      const buffer = await response.arrayBuffer();
      result = await WebAssembly.instantiate(buffer, opts);
    }
  }
  return result.instance.exports;
};

export const code = wasmHelper.toString();

export async function parseWasm(wasmFilePath: string): Promise<WasmInfo> {
  try {
    const wasmBinary = await fs.promises.readFile(wasmFilePath);
    const wasmModule = await WebAssembly.compile(wasmBinary);
    const imports = Object.entries(
      WebAssembly.Module.imports(wasmModule).reduce(
        (result, item) => ({
          ...result,
          [item.module]: [...(result[item.module] || []), item.name]
        }),
        {} as Record<string, string[]>
      )
    ).map(([from, names]) => ({ from, names }));

    const exports = WebAssembly.Module.exports(wasmModule).map(item => item.name);

    return { imports, exports };
  } catch (e) {
    throw new Error(`Failed to parse WASM file: ${e.message}`);
  }
}

export async function generateGlueCode(
  wasmFilePath: string,
  names: { initWasm: string; wasmUrl: string }
): Promise<string> {
  const { imports, exports } = await parseWasm(wasmFilePath);
  return `
${imports
      .map(
        ({ from, names }, i) =>
          `import { ${names.map((name, j) => `${name} as __vite__wasmImport_${i}_${j}`).join(", ")} } from ${JSON.stringify(
            from
          )};`
      )
      .join("\n")}
const __vite__wasmModule = await ${names.initWasm}({ ${imports
      .map(
        ({ from, names }, i) =>
          `${JSON.stringify(from)}: { ${names.map((name, j) => `${name}: __vite__wasmImport_${i}_${j}`).join(", ")} }`
      )
      .join(", ")} }, ${names.wasmUrl});
${exports
      .map(name => `export ${name === "default" ? "default" : `const ${name} =`} __vite__wasmModule.${name};`)
      .join("\n")}`;
}

import path from "path";
import { Plugin } from "esbuild";
import { createRequire } from "module";

export function esbuildPlugin(): Plugin {
  return {
    name: "vite-plugin-wasm",
    setup(build) {
      const NAMESPACE = "vite-plugin-wasm-namespace";

      build.onResolve({ filter: /\.wasm$/ }, args => ({
        path: createRequire(args.importer).resolve(args.path),
        namespace: NAMESPACE
      }));

      build.onLoad({ filter: /.*/, namespace: NAMESPACE }, async args => {
        const dataUri = await createBase64UriForWasm(args.path);
        return {
          contents: `
const wasmUrl = "${dataUri}";
const initWasm = ${code};
${await generateGlueCode(args.path, { initWasm: "initWasm", wasmUrl: "wasmUrl" })}
`,
          loader: "js",
          resolveDir: path.dirname(args.path)
        };
      });
    }
  };
}

export async function createBase64UriForWasm(filePath: string) {
  const base64 = await fs.promises.readFile(filePath, "base64");
  return "data:application/wasm;base64," + base64;
}