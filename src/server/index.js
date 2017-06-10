const { createServer } = require("http");

const WebSocket = require("ws");
const getRawBody = require("raw-body");

const {
  request: { encode: encodeRequest },
  response: { decode: decodeResponse }
} = require("../codec");


exports.command = "server [port]";

exports.describe = "run a server that listens for incoming HTTP and client requests";

exports.handler = argv => {
  const { port = 8008 } = argv;
  let activeConnection = null;

  let nextId = 0;
  const responseRefs = {};
  const server = createServer((req, res) => {
    if (!activeConnection) {
      res.statusCode = 503;
      res.end("Tunneling client is not currently connected.");
    }

    getRawBody(req).then(buffer => {
      const id = nextId++;
      responseRefs[id] = res;
      activeConnection.send(encodeRequest({
        id,
        url: req.url,
        method: req.method,
        headers: req.headers,
        // Buffers behave like instances of Uint8Arrays.
        body: buffer
      }));
    });
  });

  const handleResponse = message => {
    const { id, statusCode, headers, body } = decodeResponse(message);
    const res = responseRefs[id];
    responseRefs[id] = null;

    res.statusCode = statusCode;
    Object.keys(headers).forEach(key => res.setHeader(key, headers[key]));
    res.end(Buffer.from(body.slice().buffer));
  };

  const wsServer = new WebSocket.Server({ server });
  wsServer.on("connection", (ws, req) => {
    if (activeConnection) { ws.close("A client is already connected."); }
    const remoteIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`Tunnel connected from $${remoteIP}.`);
    activeConnection = ws;
    ws.on("close", () => {
      activeConnection = null;
      console.log(`Tunnel disconnected from $${remoteIP}.`)
    });
    ws.on("message", handleResponse);
  });

  server.listen(port, () => {
    console.log(`Listening on port ${server.address().port}...`);
  });
};
