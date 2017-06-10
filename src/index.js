const yargs = require("yargs");


yargs
  .command(require("./server"))
  .command(require("./tunnel"))
  .help()
  .argv
