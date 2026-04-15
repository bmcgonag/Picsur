const crypto = require('crypto');

const randomCharacters =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

module.exports.generateRandomString = function(length) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += randomCharacters[crypto.randomInt(0, randomCharacters.length - 1)];
  }
  return out;
};
