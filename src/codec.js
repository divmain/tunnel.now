const codec = require("cereal-box");


exports.request = codec({
  id: "int",
  url: "string",
  method: "string",
  headers: "json",
  body: "u8"
});

exports.response = codec({
  id: "int",
  statusCode: "int",
  headers: "json",
  body: "u8"
});
