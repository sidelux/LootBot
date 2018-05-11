const request = require('request');
module.exports = class RainbowSix {
    constructor() {

    }

    stats(username, platform, operators) {
        return new Promise((resolve, reject) => {
            if(!username || typeof username !== 'string') return reject(new TypeError('Invalid username'));
            operators = operators || false;
            if(typeof operators !== 'boolean') return reject(new TypeError('Operators has to be a boolean'));
            if(typeof platform !== 'string' || !platform) return reject(new TypeError('Invalid platform, platform types can be: uplay, xone, ps4'));
            let endpoint = `https://api.r6stats.com/api/v1/players/${username.toString()}/?platform=${platform}`;
            if(operators) {
                endpoint = `https://api.r6stats.com/api/v1/players/${username}/operators/?platform=${platform}`;
            }
            request.get(endpoint, (error, response, body) => {
                if(!error && response.statusCode == '200') {
                    return resolve(JSON.parse(body));
                } else {
                    return reject(JSON.parse(body));
                }
            })
        })
    }

    profile(username, platform) {
        return new Promise((resolve, reject) => {
            if(!username || typeof username !== 'string') return reject(new TypeError('Invalid username'));
            if(typeof platform !== 'string' || !platform) return reject(new TypeError('Invalid platform, platform types can be: uplay, xone, ps4'));
            let endpoint = `https://api.r6stats.com/api/v1/users/${username}/profile/?platform=${platform}`;
            request.get(endpoint, (error, response, body) => {
                if(!error && response.statusCode == '200') {
                    return resolve(JSON.parse(body));
                } else {
                    return reject(JSON.parse(body));
                }
            })
        })
    }
};