/*
  Provably fair module
*/

// Get all modules needed
if (typeof crypto === 'undefined'){ var crypto = require('crypto'); }
if (typeof mersenne === 'undefined'){ var mersenne = require('mersenne'); }

var PF = {

  fingerprint: function(str){
    return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
  },
  
  shuffle: function(initialShuffle, serverSeed, clientSeed){
    var hash_secret = this.fingerprint( serverSeed + initialShuffle );
    var seedString =  this.fingerprint( clientSeed + serverSeed );

    // Take the bottom 32 bits of the hash to use as the seed for the RNG.
    var seed = parseInt(seedString.substring(seedString.length - 8), 16);

    var mt = new mersenne.MersenneTwister19937();
    mt.init_genrand(seed);

    var reshuffled = this.shuffleDeck(String(initialShuffle), mt);

    return {'reshuffled': reshuffled, 'hash_secret': hash_secret, 'serverSeed': serverSeed, 'initialShuffle': initialShuffle, 'clientSeed': clientSeed};
  },

  // Shuffles a string using the Fisher-Yates shuffle algorithm for card decks.
  shuffleDeck: function(deckString, mt) {
    var tmp, newDeck = deckString.split(",");
    newDeck = this.fisherYatesShuffle(newDeck, mt);
    return newDeck.join(",");
  },
      
  // Shuffles an array using the Fisher-Yates shuffle algorithm.
  fisherYatesShuffle: function (collection, mt) {
    var r;
    for (var i = collection.length - 1; i > 0; i--) {
      var int32 = mt.genrand_int32();
      //var int32 = mt.rand();
      r = int32 % (i + 1);
      tmp = collection[r];
      collection[r] = collection[i];
      collection[i] = tmp;
    }
    return collection;
  }

};

module.exports = PF;