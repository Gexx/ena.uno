var CardColors = ["R", "Y", "G", "B"]; // Red, Yellow, Green, Blue
var CardSymbols = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "S", "R", "D", "W", "F"]; // "Zero", "Wild", And "Wild Four" are only 4

var NumberOfPlayers = 4; // How many players are playing.
var Dealer = 1; // Player who is dealer.
var Direction = "clockwise"; // "counterclockwise"

var TopCard = "";
var PlayerOnTurn = Dealer;
var PlayerHands = [];
var DECK = [];
var DiscardPile = [];

function CreateUnoDeck() {
  var UnoDeck = [];

  var newCard = "";
  for(var x = 0; x < 2; x++){
    for(var i = 0; i < CardColors.length; i++){
      for(var j = 0; j < CardSymbols.length; j++){

        if(CardSymbols[j] === "W" || CardSymbols[j] === "F"){
          newCard = CardSymbols[j];
        }else{
          newCard = CardColors[i]+CardSymbols[j];
        }

        if(x === 0){
          if(CardSymbols[j] === "F"){
            // First round have all cards but no "Wild Four"
          }else{
            UnoDeck.push(newCard);
          }
        }else if(x === 1){
          if(CardSymbols[j] === "0" || CardSymbols[j] === "W"){
            // Second round have all cards but no "Zero" and "Wild"
          }else{
            UnoDeck.push(newCard);
          }
        }

      }
    }
  }

  return UnoDeck;
}

function DealCardsToPlayers(deck_array, NumberOfPlayers, cards_to_deal) {
  NumberOfPlayers = NumberOfPlayers || 6;
  cards_to_deal = cards_to_deal || 7;

  var PlayerHands = [];
  var Hand = [];
  for(var i = 0; i < NumberOfPlayers; i++){
    Hand = [];
    for(var j = 0; j < cards_to_deal; j++){
      Hand.push(deck_array[ (j * NumberOfPlayers) + i ]);
    }
    PlayerHands.push( Hand );
  }

  deck_array = deck_array.slice(cards_to_deal * NumberOfPlayers, deck_array.length);

  return {"NewDeck": deck_array, "PlayerHands": PlayerHands};
}

function DealCard(deck_array) {
  var TopCard = deck_array[0];
  deck_array = deck_array.slice(1, deck_array.length);

  return {"NewDeck": deck_array, "TopCard": TopCard, "Discard": TopCard};
}

function NextPlayer(played, player_num, clockwise){
  if(typeof clockwise !== "boolean"){ clockwise = true; }
  if(clockwise === true){
    return ( (played+1) % player_num);
  }else{
    return ( (played+player_num-1) % player_num);
  }
}

function ParseCard(Card){
  var Card_OBJ = Card.split("");
  if(Card_OBJ[0] === "W" || Card_OBJ[0] === "F"){
    Card_OBJ[1] = Card_OBJ[0];
    Card_OBJ[0] = "X";
  }
  return Card_OBJ;
}

function PlayCard(Player, Card, TopCard) {
  var Card_OBJ = ParseCard(Card);
  var TopCard_OBJ = ParseCard(TopCard);

  var ValidPlay = false;
  var ValidPlayDesc = "Invalid color & symbol.";

  if(Card_OBJ[1] === "W" || Card_OBJ[1] === "F"){
      // It is a Wild Card
      ValidPlay = true;
      ValidPlayDesc = "Wild Card.";
  }else if(Card_OBJ[0] === TopCard_OBJ[0] || TopCard_OBJ[0] === "X"){
    // Cards have same color, you can play
    ValidPlay = true;
    ValidPlayDesc = "Same color. (Or TopCard is X)";
  }else{
    // Card in hand is not same color and is not Wild Card
    if(Card_OBJ[1] === TopCard_OBJ[1]){
      // Card has the same symbol
      ValidPlay = true;
      ValidPlayDesc = "Same symbol.";
    }
  }

  var Discard = "";
  if(ValidPlay === true){
    if(TopCard_OBJ[1] === "W" || TopCard_OBJ[1] === "F"){
      Discard = TopCard_OBJ[1];
    }else{
      Discard = TopCard_OBJ.join("");
    }
    TopCard = Card_OBJ.join("");
  }

  return {"ValidPlay": ValidPlay, "ValidPlayDesc": ValidPlayDesc, "TopCard": TopCard, "Discard": Discard, "NextPlayer": NextPlayer(PlayerOnTurn, NumberOfPlayers)};
}

function MnemonicNumber(num){
  var card_name = "";
  if(num === "0"){ card_name = "zero"; }
  if(num === "1"){ card_name = "one"; }
  if(num === "2"){ card_name = "two"; }
  if(num === "3"){ card_name = "three"; }
  if(num === "4"){ card_name = "four"; }
  if(num === "5"){ card_name = "five"; }
  if(num === "6"){ card_name = "six"; }
  if(num === "7"){ card_name = "seven"; }
  if(num === "8"){ card_name = "eight"; }
  if(num === "9"){ card_name = "nine"; }
  if(num === "R"){ card_name = "rotate"; }
  if(num === "S"){ card_name = "skip"; }
  if(num === "W"){ card_name = "wild"; }
  if(num === "D"){ card_name = "draw two"; }
  if(num === "F"){ card_name = "wild draw four"; }
  return card_name;
}
function MnemonicColor(color){
  var card_color = "";
  if(color === "R"){ card_color = "red"; }
  if(color === "B"){ card_color = "blue"; }
  if(color === "Y"){ card_color = "yellow"; }
  if(color === "G"){ card_color = "green"; }
  if(color === "X"){ card_color = "special"; }
  return card_color;
}

module.exports = {"CreateUnoDeck" : CreateUnoDeck, "DealCardsToPlayers": DealCardsToPlayers, "DealCard": DealCard, "NextPlayer": NextPlayer, "ParseCard": ParseCard, "MnemonicColor": MnemonicColor, "MnemonicNumber": MnemonicNumber};