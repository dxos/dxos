//
// Copyright 2025 DXOS.org
//

/**
 * Demo of the enhanced CLI TUI.
 * Run with: tsx src/examples/demo.tsx
 */

import React from "react";
import { render } from "ink";
import { App } from "../components/App";

// Simulate command execution
const handleCommand = async (
	command: string,
	addMessage: (msg: {
		role: "user" | "assistant" | "system";
		content: string;
	}) => string,
	updateMessage: (id: string, content: string) => void,
) => {
	// Simulate processing delay
	await new Promise((resolve) => setTimeout(resolve, 500));

	// Simulate some commands
	if (command.toLowerCase().includes("help")) {
		addMessage({
			role: "system",
			content:
				"Available commands:\n  help     - Show this help message\n  status   - Show system status\n  quit     - Exit the application",
		});
	} else if (command.toLowerCase().includes("status")) {
		addMessage({
			role: "system",
			content: "System Status:\n  ● Connected\n  ● Ready",
		});
	} else if (command.toLowerCase().includes("quit")) {
		process.exit(0);
	} else {
		// Simulate streaming response with throttling
		const messageId = addMessage({
			role: "assistant",
			content: "",
		});

		const response = `You said: "${command}"`;
		const chunkSize = 5; // Update every 5 characters to reduce flicker

		for (let i = 0; i <= response.length; i += chunkSize) {
			await new Promise((resolve) => setTimeout(resolve, 50));
			updateMessage(
				messageId,
				response.slice(0, Math.min(i + chunkSize, response.length)),
			);
		}

		// Ensure final complete message
		updateMessage(messageId, response);
	}
};

// Render the app
render(<App onCommand={handleCommand} title="DXOS CLI Demo" />);
