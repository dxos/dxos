//
// Copyright 2025 DXOS.org
//

import { Blueprint } from '@dxos/blueprints';
import { Tag, type Type } from '@dxos/echo';
import { DataTypes } from '@dxos/schema';
import {
  AnchoredTo,
  Employer,
  Event,
  HasConnection,
  HasRelationship,
  HasSubject,
  Organization,
  Person,
  Project,
  Task,
} from '@dxos/types';

export const typeRegistry: Type.Entity.Any[] = [
  ...DataTypes,
  AnchoredTo.AnchoredTo,
  Blueprint.Blueprint,
  Employer.Employer,
  Event.Event,
  HasConnection.HasConnection,
  HasRelationship.HasRelationship,
  HasSubject.HasSubject,
  Organization.Organization,
  Person.Person,
  Project.Project,
  Tag.Tag,
  Task.Task,
];

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
};

/**
 * Create a user message.
 */
export const createUserMessage = (content: string): Message => ({
  id: `user-${Date.now()}`,
  role: 'user',
  content,
  timestamp: new Date(),
});

/**
 * Create an empty assistant message placeholder.
 */
export const createAssistantMessage = (): Message => ({
  id: `assistant-${Date.now()}`,
  role: 'assistant',
  content: '',
  timestamp: new Date(),
});

/**
 * Create an error message.
 */
export const createErrorMessage = (error: unknown): Message => ({
  id: `error-${Date.now()}`,
  role: 'error',
  content: `Error: ${String(error)}`,
  timestamp: new Date(),
});
