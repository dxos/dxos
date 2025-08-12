import { GenerationObserver } from "@dxos/assistant";

export class StdoutPrinter {
  observer(): GenerationObserver {
    return GenerationObserver.make({
      // onBlock: (block) => Effect.sync(() => console.log(block)),
      // onMessage: (message) => Effect.sync(() => console.log(message)),
    });
  }
}
  