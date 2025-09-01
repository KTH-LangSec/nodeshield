const http = require("http");
const st = require("st");
const handler = st(process.cwd());
http.createServer(handler).listen(1337);
