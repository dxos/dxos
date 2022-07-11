export type TodoList = {
  id: string
  title: string
  items: TodoItem[]
}

export type TodoItem = {
  id: string;
  title: string;
  createdAt?: Date;
  completedAt?: Date;
};