const { createServer } = require("http");

const yargs = require("yargs");
const WebSocket = require("ws");
const getRawBody = require("raw-body");

const {
  request: { encode: encodeRequest },
  response: { decode: decodeResponse }
} = require("./codec");


const { _: [ port = 8008 ], debug } = yargs
  .usage('$0 [--debug|-d] [port]')
  .option('debug', {
    alias: 'd',
    default: false
  })
  .help()
  .argv;


let client = null;
let nextId = 0;

const responseRefs = {};
const server = createServer((req, res) => {
  if (!client) {
    res.statusCode = 503;
    res.end("Tunneling client is not currently connected.");
    return;
  }

  getRawBody(req).then(buffer => {
    const id = nextId++;
    responseRefs[id] = res;
    client.send(encodeRequest({
      id,
      url: req.url,
      method: req.method,
      headers: req.headers,
      // Buffers behave like instances of Uint8Arrays.
      body: buffer
    }));
  });
});

const wss = new WebSocket.Server({ server });
wss.on("connection", (ws, req) => {
  if (client) { ws.close("A client is already connected."); }

  const remoteIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log(`Tunnel connected from $${remoteIP}.`);

  client = ws;
  client.alive = true;

  client.on("close", () => {
    client = null;
    console.log(`Tunnel disconnected from $${remoteIP}.`)
  });

  client.on("message", message => {
    const { id, statusCode, headers, body } = decodeResponse(message);
    const res = responseRefs[id];
    delete responseRefs[id];
  
    res.statusCode = statusCode;
    Object.keys(headers).forEach(key => res.setHeader(key, headers[key]));
    // Alternately, `Buffer.from(body.slice().buffer)`.
    res.end(Buffer.from(body.buffer, body.byteOffset, body.length));
  });

  client.on("pong", () => {
    if ( debug ) {
      console.log( ' <- pong ' );
    }
    client.alive = true;
  });
});

const interval = setInterval(() => {
  if ( !client ) {
    return;
  }

  if ( !client.alive ) {
    client.terminate();
    return;
  }

  client.alive = false;
  client.ping(() => {
    if ( debug ) {
      console.log( ' ping -> ' );
    }
  });
}, 30000);

server.listen(port, () => {
  console.log(`Listening on port ${server.address().port}...`);
});
