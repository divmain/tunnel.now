#!/usr/bin/env node

const yargs = require("yargs");
const WebSocket = require("ws");
const fetch = require("node-fetch");
const url = require( 'url' );

const {
  request: { decode: decodeRequest },
  response: { encode: encodeResponse }
} = require("./codec");


const { _: [ remote, localPort ] } = yargs
  .usage('tunnel.now <remote> <local-port>')
  .help()
  .argv;

if (!remote) {
  console.error("You must supply a url for the remote tunnel.");
  process.exit(1);
}
if (!localPort) {
  console.error("You must indicate which local port that requests should be forwarded to.");
  process.exit(1);
}

const baseTargetUrl = `http://localhost:${localPort}`;

const parsed_remote = url.parse( remote );
const uri = `${ parsed_remote.protocol === 'http:' ? 'ws:' : 'wss:' }//${ parsed_remote.hostname || parsed_remote.href }:${ parsed_remote.port || ( parsed_remote.protocol === 'http:' ? 80 : 443 ) }`;
console.log( `Connecting to ${uri}...` );
const ws = new WebSocket(uri);

ws.on("open", () => {
  console.log(`Connected to ${uri}.`);
  console.log(`Tunneling requests to ${baseTargetUrl}...`);
});

ws.on("message", ev => {
  const {
    id,
    url,
    method,
    headers,
    body
  } = decodeRequest(ev);

  console.log(`> ${method} ${url}`);
  console.log(`> headers: ` );
  console.dir( headers );
  console.log( `>` );
  console.log( `> body:` );
  console.log( Buffer.isBuffer( body ) && body.length ? body.toString() : '<none>' );

  const options = {
    method,
    headers,
    redirect: "manual"
  };

  if ( Buffer.isBuffer( body ) && body.length ) {
    // Alternately, `Buffer.from(body.slice().buffer)`.
    options.body = Buffer.from(body.buffer, body.byteOffset, body.length);
  }

  fetch(`${baseTargetUrl}${url}`, ).then(response => {
    return response.buffer().then(body => {
      ws.send(encodeResponse({
        id,
        statusCode: response.status,
        headers: response.headers.raw(),
        body
      }));
    });
  }).catch( error => {
    if ( error.code === 'ECONNREFUSED' ) {
        ws.send(encodeResponse({
          id,
          statusCode: 503,
          headers: {
            'Content-Type': 'application/json'
          },
          body: Buffer.from( JSON.stringify( {
            error: 'Connection refused by tunneled host.'
          } ) )
        }));
        return;
    }

    ws.send(encodeResponse({
      id,
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: Buffer.from( JSON.stringify( error ) )
    }));
} );
});

const keepAliveId = setInterval(() => {
  ws.send("PING");
}, 60000);

ws.on("close", () => {
  clearInterval(keepAliveId);
  console.log("The connection has been terminated.");
});

ws.on("error", ev => {
  console.dir(ev);
  if (ev.code === "ECONNREFUSED") {
    console.log("We were unable to establish a connection with the server.");
  } else {
    console.log(ev.toString());
  }
});
