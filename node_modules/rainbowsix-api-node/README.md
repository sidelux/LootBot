# rainbowsix-api-node
Async JavaScript wrapper for Rainbow Six Siege stats and player profiles using ES6 promises

## Example:
```javascript
const RainbowSixApi = require('rainbowsix-api-node');
const R6 = new RainbowSixApi();

let username = '<username here>';
let platform = '<platforms : uplay, xone, ps4>';

//Get stats on the user on that platform
R6.stats(username, platform, /*optional true or false if you want operator details or not*/).then(response => {
    console.log(response);
}).catch(error => {
    console.error(error)
});

//For getting details about a user on R6 depending on platform
R6.profile(username, platform).then(response => {
    console.log(response);
}).catch(error => {
    console.error(error);
});
```

## Installation
```
npm i rainbowsix-api-node --save
```

Using <https://r6stats.com/> for the API and stats

