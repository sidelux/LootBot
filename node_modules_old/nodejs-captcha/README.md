# nodejs-captcha
Creates Captcha in base64 format

# installation
`npm install nodejs-captcha`

# usage
```javascript 
// import library
var captcha = require("nodejs-captcha");

// Create new Captcha
var newCaptcha = captcha();

// Value of the captcha
var value = newCaptcha.value

// Image in base64 
var imagebase64 = newCaptcha.image;

// Width of the image
var width = newCaptcha.width;

// Height of the image
var height = newCaptcha.heigth;

```
### sample usage with nodejs http
``` javascript

"use strict";
var http = require("http");
var captcha = require("nodejs-captcha");
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
  console.log("Server listening on: https://localhost:" + PORT);
});
```

It is recommended to store the value of the captcha in order to check the validity of the user's answer to challange
