# CRM

## Background

Customer relationship management (CRM) is a set of integrated, data-driven software solutions that help manage, track, and store information related to your company’s current and potential customers. By keeping this information in a centralized system, business teams have access to the insights they need, the moment they need them. [https://dynamics.microsoft.com/en-us/crm/what-is-crm]


## User Stories

- Users can create Spaces containing multiple Tables that display records of a given Schema.
- Objects associated with a given Schema can be created, viewed, and manipulated by Tables and Kanban.
- Teams can create Spaces from templates:
  - The CRM template contains definitions for Organization, Project, and Person schema.
  - The Recruiting template contains definitions for Interview and Pipeline schema.
- Users enter records in the Projects table.
- The GitHub Sourcing Function crawls and updates Person records associated with each Project.
- Users drag Person records into the Pipeline kanban.
- Users can enter Interview feedback by creating a form (Card).
- The set of Interview forms can be views as a Stack associated with the Candidate.


## Issues

- Sharing schema across Spaces.
- Cross-space references.
- Lenses.
- Access control.


## Components

### Table

- Tables are a primary View component type that displays a collection of objects based off of a user-customizable query.
- The Table plugin can be used to create a new Schema and/or configure the View from an existing Schema.
- The Table metadata includes layout information (e.g., column width) and View configuration (e.g., sort, filter).
- Table columns types include: numbers (floats, integers), strings (simple and markdown text), booleans, dates, constrained values (enums), attachments (e.g., IPFS files), and references (singular or sets).
- Table cells containing references can be updated via a type-ahead component that matches records from the referenced data set (e.g., Schema type).
- Tables may be virtualized to enable large (> 1000 object) collections.
- Table rows can be re-ordered via drag-and-drop.
- Table rows can be dragged to or from other containers.
- Table rows can be inserted and deleted. A "hanging-edit" table row is always visible at the bottom of the table to enable quickly adding records.
- Table rows can be selected.
- Tables can be embedded within Stacks.

### Kanban

- Kanbans a kind of View component that displays a collection of objects based off of a user-customizable query.
- Kanbans can be optionally associated with a Schema.
- Objects are represented by generic cards that can interpret the Schema associated with each object (e.g., title/content, image).
- Cards can be re-ordered and moved between columns via drag-and-drop.
- Cards can be dragged to or from other containers.

### Chat

- Each View can be displayed alongside a Chat.
- Chat messages will have access to the View (and selection state) as a context.
- Chat messages may include reference to View objects, which are represented via Cards that can be dragged and dropped into Views.

### Inbox

- The Inbox is a custom tabular representation of Message objects.
