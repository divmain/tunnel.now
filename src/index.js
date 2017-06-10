const yargs = require("yargs");


yargs
  .command(require("./tunnel"))
  .help()
  .argv
