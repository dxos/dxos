// express application with cors and a single route adding a record to a mongodb collection

import express from 'express';
import cors from 'cors';
import { Collection, MongoClient } from 'mongodb';
import bodyParser from 'body-parser';
import ws from 'ws'

(async () => {
  const app = express();
  const port = 7630; // default port to listen

  // define a route handler for the default home page
  app.get("/", (req, res) => {
    res.send("Hello world!");
  });

  app.use(cors());
  app.use(bodyParser.json());

  const client = await MongoClient.connect('mongodb://docker:mongopw@localhost:55002')
  const db = client.db('telemetry');
  var collection: Collection<Document>
  try {
    collection = await db.createCollection('telemetry', { capped: true, size: 1000000, max: 1000 })
    console.log('created')
  } catch (e) {
    console.log('collection already exists')
    collection = db.collection('telemetry')
  }

  app.post('/api/telemetry', async (req, res) => {
    const telemetry = req.body;
    console.log(telemetry);
    // insert into mongodb

    await collection.insertOne(telemetry)

    res.status(201).end();
  });


  const wsServer = new ws.Server({ noServer: true });
  wsServer.on('connection', socket => {
    let subscribed = false;
    socket.on('message', message => {
      if(subscribed) {
        return;
      }
      const request = JSON.parse(message.toString());
      switch(request.type) {
        case 'subscribe': {
          if(subscribed) {
            return;
          }

          
          const cursor = collection.find(request.filter, { tailable: true });
          cursor.stream().on('data', (doc) => {
            socket.send(JSON.stringify(doc));
          });



          
          // subscribe to records in mongodb

          break;
        }
        default: {
          console.log('unknown request type', request.type);
          break;
        }
      }
    });
  });

  // start the Express server
  const server = app.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`server started at http://localhost:${port}`);
  });

  server.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, socket => {
      wsServer.emit('connection', socket, request);
    });
  });
})()
