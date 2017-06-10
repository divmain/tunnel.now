const WebSocket = require("ws");
const { default: fetch, Headers } = require("node-fetch");

const {
  request: { decode: decodeRequest },
  response: { encode: encodeResponse }
} = require("../codec");


exports.command = "tunnel <remote-hostname> <local-port>";

exports.describe = "run a server that listens for incoming HTTP and client requests";

exports.handler = argv => {
  const { remoteHostname, localPort } = argv;
  const baseTargetUrl = `http://localhost:${localPort}`;

  const uri = `ws://localhost:8008`;
  // const uri = `wss://${remoteHostname}:443`;
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
      body: Buffer.from(body.buffer),
      redirect: "manual"
    }).then(response => {
      return response.buffer().then(body => {
        socket.send(encodeResponse({
          id,
          statusCode: response.status,
          headers: response.headers,
          body
        }));
      });
    });
  });

  socket.addEventListener("close", () => {
    console.log("The connection has been terminated.");
  });

  socket.addEventListener("error", ev => {
    if (ev.code === "ECONNREFUSED") {
      console.log("We were unable to establish a connection with the server.");
    } else {
      console.log(ev.toString());
    }
  });
};
