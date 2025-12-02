//
// Copyright 2025 DXOS.org
//

export type MessageRole = "user" | "assistant" | "system";

export type Message = {
	id: string;
	role: MessageRole;
	content: string;
	timestamp: Date;
};

export type ChatState = {
	messages: Message[];
	isLoading: boolean;
	error?: string;
};
