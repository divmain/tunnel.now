#!/usr/bin/env node

const yargs = require("yargs");
const WebSocket = require("ws");
const { default: fetch, Headers } = require("node-fetch");

const {
  request: { decode: decodeRequest },
  response: { encode: encodeResponse }
} = require("./codec");


const { _: [ remoteHostname, localPort ] } = yargs
  .usage('tunnel.now <remote-hostname> <local-port>')
  .help()
  .argv;

if (!remoteHostname) {
  console.error("You must supply a name for a remote host, listening on port 443.");
  process.exit(1);
}
if (!localPort) {
  console.error("You must indicate which local port that requests should be forwarded to.");
  process.exit(1);
}

const baseTargetUrl = `http://localhost:${localPort}`;

const uri = `wss://${remoteHostname}:443`;
const socket = new WebSocket(uri);

socket.addEventListener("open", () => {
  console.log(`Connected to ${uri}.`);
  console.log(`Tunneling requests to ${baseTargetUrl}...`);
});

socket.addEventListener("message", ev => {
  const {
    id,
    url,
    method,
    headers,
    body
  } = decodeRequest(ev.data);

  console.log(`> ${method} ${url}`);

  fetch(`${baseTargetUrl}${url}`, {
    method,
    headers,
    // Alternately, `Buffer.from(body.slice().buffer)`.
    body: Buffer.from(body.buffer, body.byteOffset, body.length),
    redirect: "manual"
  }).then(response => {
    return response.buffer().then(body => {
      socket.send(encodeResponse({
        id,
        statusCode: response.status,
        headers: response.headers.raw(),
        body
      }));
    });
  });
});

const keepAliveId = setInterval(() => {
  socket.send("PING");
}, 60000);

socket.addEventListener("close", () => {
  clearInterval(keepAliveId);
  console.log("The connection has been terminated.");
});

socket.addEventListener("error", ev => {
  if (ev.code === "ECONNREFUSED") {
    console.log("We were unable to establish a connection with the server.");
  } else {
    console.log(ev.toString());
  }
});
