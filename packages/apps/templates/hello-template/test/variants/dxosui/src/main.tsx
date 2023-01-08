import React from "react";
import { createRoot } from "react-dom/client";

// this includes css styles from @dxos/react-components
// this must precede all other style imports in the app
import "@dxosTheme";

import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
