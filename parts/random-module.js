/*
  Random module
*/

// Get crypto module
if (typeof crypto === 'undefined'){ var crypto = require('crypto'); }

var OBJ = {

  getRandomInt: function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  GenerateRandomString: function(n, possible) {
    n = n || 64;
    possible = possible || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    var text = '';
    for( var i=0; i < n; i++ ){
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
  },

  SHA256: function(str){
    return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
  }

};

module.exports = OBJ;