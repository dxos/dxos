import React from "react";
import { createRoot } from "react-dom/client";

// This includes css styles from @dxos/react-ui-theme.
// This must precede all other style imports in the app.
import "@dxosTheme";

import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
