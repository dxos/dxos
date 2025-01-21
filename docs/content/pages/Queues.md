- Design
	- Belongs to a space (identified as space id)
		- Used for sharding
		- Different kind of space then the usual echo space
	- Each queue is identified by its ID
		- Same schema as ObjectID
		- Queue has a DXN of `dxn:queue:<spaceId>:<queueId>`
	- Queues are automatically created when the first object is inserted
	- Queues contain typed ECHO objects
		- Each object has an echo id
			- Each object in a queue can be identified with `dxn:queue:<spaceId>:<queueId>:<objectId>`
		- Each has a typename (with version and schema reference)
		- Single queue can contain objects of mixed types
	- Queue orders the objects in the insertion order
		- Consumers can query the front/tail of the queue
			- Queues expose opaque cursors that can be used for paging (reading the entire queue in chunks)
		- Consumers can delete objects from a queue
			- Using cursors
			- Using ECHO ids
	- Objects inside a queue can be garbage-collected
		- Queues can be configured with expiration time
	- Objects in the queue are mutable
		- We use lamport timestamps for versioning.
- Implementation
	- One durable object per queues space
	- Using sqlite for DOs as this seems to be the direction cloudflare is moving towards
	- Schema
		- `queue-entries`
			- ```sql
			  CREATE TABLE queue_entries (
			      -- auto-incremented key used for range queries
			      id INTEGER AUTOINCREMENT PRIMARY KEY,
			      queue_id TEXT,
			    	object_id TEXT, -- ECHO object id of each object
			      type_dxn TEXT, -- Extracted from echo object for faster lookup
			    	created_ts INTEGER, -- Unix timestap of the creation time
			      updated_ts INTEGER, -- Unix timestap of the update time
			    	version TEXT, -- Reserved for the lamport clock of the object version, NULL for now
			    
			    	data TEXT, -- Object data in JSON format
			      
			      INDEX idx_range (queue_id, id), -- For efficient range queries.
			    	UNIQUE INDEX idx_object_id (queue_id, object_id), -- Ensures that queue don't have duplicate object ids.
			  );
			  ```