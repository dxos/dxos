//
// Copyright 2025 DXOS.org
//

/**
 * Ollama-enabled demo of the enhanced CLI TUI.
 * Run with: tsx src/examples/ollama-demo.tsx
 *
 * Requires Ollama server running on localhost:11434
 * Install: https://ollama.ai
 * Start server: ollama serve
 * Pull model: ollama pull llama3.2
 */

import React from "react";
import { render } from "ink";
import { App } from "../components/App";
import { streamOllamaResponse, checkOllamaServer } from "../util/ollama";

const handleCommand = async (
	command: string,
	addMessage: (msg: {
		role: "user" | "assistant" | "system";
		content: string;
	}) => string,
	updateMessage: (id: string, content: string) => void,
) => {
	const trimmedCommand = command.trim();

	// Handle exit commands
	if (["quit", "exit", "q"].includes(trimmedCommand.toLowerCase())) {
		process.exit(0);
	}

	// Check for help command
	if (trimmedCommand.toLowerCase() === "help") {
		addMessage({
			role: "system",
			content:
				"Ollama CLI Commands:\n  help  - Show this help message\n  quit  - Exit the application\n  <any> - Send prompt to Ollama",
		});
		return;
	}

	// Add an assistant message that we'll update with streaming content
	const messageId = addMessage({
		role: "assistant",
		content: "",
	});

	// Stream the prompt to Ollama with throttled updates
	try {
		let streamingContent = "";
		let lastUpdateTime = 0;
		const UPDATE_INTERVAL_MS = 50; // Update UI every 50ms to reduce flicker

		await streamOllamaResponse(trimmedCommand, (chunk: string) => {
			streamingContent += chunk;

			// Throttle UI updates to reduce flickering
			const now = Date.now();
			if (now - lastUpdateTime >= UPDATE_INTERVAL_MS) {
				updateMessage(messageId, streamingContent);
				lastUpdateTime = now;
			}
		});

		// Final update to ensure we have the complete message
		updateMessage(messageId, streamingContent);
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		addMessage({
			role: "system",
			content: `Error: ${errorMsg}`,
		});
		throw error;
	}
};

// Check Ollama server before starting
const main = async () => {
	console.log("Checking Ollama server...");

	const isAvailable = await checkOllamaServer();

	if (!isAvailable) {
		console.error("\n❌ Ollama server is not available!");
		console.error("\nPlease ensure Ollama is running:");
		console.error("  1. Install: https://ollama.ai");
		console.error("  2. Start server: ollama serve");
		console.error("  3. Pull model: ollama pull llama3.2\n");
		process.exit(1);
	}

	console.log("✅ Ollama server is available\n");

	// Render the app
	render(<App onCommand={handleCommand} title="DXOS Ollama CLI" />);
};

main().catch((error) => {
	console.error("Failed to start:", error);
	process.exit(1);
});
