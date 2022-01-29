"use strict";
var http = require("http");
var captcha = require("./");
var PORT = 8181;

function handleRequest(req, res) {
  if (req.method === "GET" && (req.url === '/' || req.url.indexOf("index") > -1)){
    let result = captcha();
    let source = result.image;
    res.end(
      `
    <!doctype html>
    <html>
        <head>
            <title>Test Captcha</title>
        </head>
        <body>
        <label>Test image</label>
        <img src="${source}" />
        </body>
    </html>
    `
    );
  }else{
      res.end('');
  }
}

//Create a server
var server = http.createServer({}, handleRequest);

//Start server
server.listen(PORT, function() {
  console.log("Server listening on: http://localhost:" + PORT);
});
