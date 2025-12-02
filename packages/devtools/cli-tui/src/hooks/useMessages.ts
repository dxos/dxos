//
// Copyright 2025 DXOS.org
//

import { useState, useCallback } from "react";
import { type Message } from "../types";

export const useMessages = () => {
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const addMessage = useCallback(
		(message: Omit<Message, "id" | "timestamp">) => {
			const newMessage: Message = {
				...message,
				id: crypto.randomUUID(),
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, newMessage]);
			return newMessage.id;
		},
		[],
	);

	const updateMessage = useCallback((id: string, content: string) => {
		setMessages((prev) =>
			prev.map((msg) => (msg.id === id ? { ...msg, content } : msg)),
		);
	}, []);

	const clearMessages = useCallback(() => {
		setMessages([]);
	}, []);

	return {
		messages,
		isLoading,
		setIsLoading,
		addMessage,
		updateMessage,
		clearMessages,
	};
};
