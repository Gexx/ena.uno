// ####### TABLE DYNAMIC #######

// Dynamic of ENA game
module.exports = function(game_name, game_full_name, io, db){
  var _self = this; // Self referencing

  _self["name"] = game_name || "normal";
  _self["full_name"] = game_full_name || "Normal";
  _self["spectators"] = 0;

  _self["max_players"] = 6; // Max players is 6 because of client design
  _self["game_status"] = "Open";
  _self["game_mode"] = 0; // 0 - Open | 1 - Open & Waiting | 2 - Playing
  _self["time_wait_for_start"] = 10; // 30;
  _self["time_reaction"] = 15; // 10;
  _self["time_left"] = _self["time_wait_for_start"];

  _self["players"] = [];
  _self["dealer"] = "Unknown";
  _self["player_turn"] = "Unknown";
  _self["direction"] = "Unknown"; // "Clockwise"; // "Counterclockwise";

  _self["stack_plus_2"] = 0;
  _self["stack_plus_4"] = 0;

  _self["PlayerHands"] = [];
  _self["DECK"] = [];
  _self["TopCard"] = "";
  _self["DiscardPile"] = [];

  _self["CanDraw"] = true; // Flag so we can implement Play after one Draw

  var UnoEngine = require('./uno-game.js');
  var PF = require('./provably-fair.js');
  var RandomModule = require('./random-module.js');

  // Creating new UNO deck. 108 Cards
  var UnoDeck = UnoEngine.CreateUnoDeck();

  // Provably fair stuff
  var nonce = 0;
  var sseed = RandomModule.GenerateRandomString();
  var cseed = "777-777";

  // First shuffle
  var hash = PF.fingerprint(sseed + UnoDeck.join(","));
  _self["hash"] = hash;

  // ### Main commands ###

  // Send the game info
  _self["GameMsg"] = function (str, player_index){
    io.to('user-'+_self["players"][player_index]["id"]).emit('game_message', str);
  };
  _self["Msg"] = function (str, player_index){
    io.to('user-'+_self["players"][player_index]["id"]).emit('message', str);
  };
  _self["Err"] = function (str, player_index){
    io.to('user-'+_self["players"][player_index]["id"]).emit('err', str);
  };

  // ### Main commands ###

  // Add Spectator
  _self["AddSpectator"] = function(){
    _self["spectators"] += 1;
    EmitTableStatus();
  };

  // Remove Spectator
  _self["RemoveSpectator"] = function(){
    _self["spectators"] -= 1;
    EmitTableStatus();
  };

  // Add Player
  _self["AddPlayer"] = function(data){
    // Data: {"id": id, "nick": nick, "online": true}
    _self["players"].push( data );

    // Reset time counter when new player enters the game.
    _self["time_left"] = _self["time_wait_for_start"];
    EmitTimeChange(_self["time_wait_for_start"]);

    // We should send only safe data from players variable.
    var data_to_send = [];
    for(var i=0; i < _self["players"].length; i++){
      data_to_send[i] = {};
      if(_self["PlayerHands"][i]){
        data_to_send[i]["cards"] = _self["PlayerHands"][i].length;
      }else{
        data_to_send[i]["cards"] = 0;
      }
      data_to_send[i]["nick"] = _self["players"][i]["nick"];
    }
    io.to('table-'+_self["name"]).emit('player_list', data_to_send);

    for(var i=0; i < _self["players"].length; i++){
      io.to('user-'+_self["players"][i]["id"]).emit('player_you', i);
    }

    // Check if players are more than one, start the counter. 
    // If there are max players start instant
    if(_self["players"].length > 1){
      _self["game_mode"] = 1;
    }else if(_self["players"].length === _self["max_players"]){
      _self["game_mode"] = 1;
      _self["time_left"] = 0;
    }

    EmitTableStatus();
  };

  // Player has left the game
  _self["PlayerLeft"] = function(player_index){
    _self["players"][player_index]["online"] = false;

    var number_of_offline_players = 0;
    for(var i=0; i < _self["players"].length; i++){
      if( _self["players"][i]["online"] === false ){ number_of_offline_players++; }
    }

    if(number_of_offline_players === _self["players"].length){
      reset_the_game();
    }
  };

  // Player has reconnected
  _self["PlayerReconnected"] = function(player_index){
      _self["players"][player_index]["online"] = true;
      
      EmitPlayerTurn();
      EmitTableStatus();

      var i = player_index;

      io.to('user-'+_self["players"][i]["id"]).emit('player_hand', _self["PlayerHands"][i]);
      io.to('user-'+_self["players"][i]["id"]).emit('player_you', i);

      io.to('table-'+_self["name"]).emit('player_card_number', {"index": i, "num": _self["PlayerHands"][i].length});
  };

  
  // Player plays a card
  _self["Play"] = function(player_index, card_index, metadata){

    // Get the card he wants to play
    var card = _self["PlayerHands"][player_index][card_index];

    var CARD_OBJ = UnoEngine.ParseCard(card);
    var CARD_TOP = UnoEngine.ParseCard(_self["TopCard"]);

    // Check if we can play that card
    if(CARD_OBJ[1] === CARD_TOP[1] && ( CARD_TOP[1] === "F" || CARD_TOP[1] === "W" || CARD_OBJ[0] === CARD_TOP[0] ) ){
      if( _self["player_turn"] !== player_index ){ io.to('user-'+_self["players"][player_index]["id"]).emit('jump'); }
      _self["player_turn"] = player_index;
    }
    
    // Check if we are on turn, else nothing
    if(player_index !== _self["player_turn"]){ return; }

    // ### CHECK IF VALID PLAY ###
    var ValidPlay = false;
    var ValidPlayDesc = "Invalid color & symbol.";

    if(CARD_OBJ[1] === "W" || CARD_OBJ[1] === "F"){
        // It is a Wild Card
        ValidPlay = true;
        ValidPlayDesc = "Wild Card.";
    }else if(CARD_OBJ[0] === CARD_TOP[0] || CARD_TOP[0] === "X"){
      // Cards have same color, you can play
      ValidPlay = true;
      ValidPlayDesc = "Same color. (Or TopCard is X)";
    }else{
      // Card in hand is not same color and is not Wild Card
      if(CARD_OBJ[1] === CARD_TOP[1]){
        // Card has the same symbol
        ValidPlay = true;
        ValidPlayDesc = "Same symbol.";
      }
    }

    // Checking if metadata for special cards is ok
    if(CARD_OBJ[1] === "0"){
      if( typeof metadata === "string"){
        if(metadata.match(/^[0-9]{1,3}$/ig)){
          var pl_index = parseInt(metadata, 10);
          if(pl_index >= 0 && pl_index < _self["PlayerHands"].length){
            if(pl_index !== player_index){
              // zero metadata is ok
            }else{
              ValidPlay = false;
            }
          }else{
            ValidPlay = false;
          }
        }else{
          ValidPlay = false;
        }
      }else{
        ValidPlay = false;
      }
    }
    if(CARD_OBJ[1] === "W" || CARD_OBJ[1] === "F"){
      if( typeof metadata === "string"){
        if(metadata.match(/^(blue|red|green|yellow)$/ig)){
          // wild metadata is ok
        }else{
          ValidPlay = false;
        }
      }else{
        ValidPlay = false;
      }
    }

    if(ValidPlay === false){
      io.to('user-'+_self["players"][player_index]["id"]).emit('invalid_card', card_index);
      io.to('user-'+_self["players"][player_index]["id"]).emit('game_message', "Invalid card!");
      return;
    }

    // ### CHECK IF VALID PLAY END ###

    // ### EFFECTS ###
    // Draw 4
    if(CARD_OBJ[1] === "F"){
      _self["stack_plus_4"] += 4;
    }

    // Draw 2
    if(CARD_OBJ[1] === "D"){
      _self["stack_plus_2"] += 2;
    }

    // Check if penalty is stacking
    if(_self["stack_plus_2"] > 0){
      if(CARD_OBJ[1] !== "D"){
        draw_n_cards( _self["stack_plus_2"], player_index );
        _self["stack_plus_2"] = 0;
      }
    }

    if(_self["stack_plus_4"] > 0){
      if(CARD_OBJ[1] !== "F"){
        draw_n_cards( _self["stack_plus_4"], player_index );
        _self["stack_plus_4"] = 0;
      }
    }

    // Skip
    if(CARD_OBJ[1] === "S"){
      // Next Player should play
      var Clockwise_Bool;
      if(_self["direction"] === "Clockwise"){ Clockwise_Bool = true; }else{ Clockwise_Bool = false; }
      _self["player_turn"] = UnoEngine.NextPlayer(_self["player_turn"], _self["players"].length, Clockwise_Bool);
    }

    // Rotation
    if(CARD_OBJ[1] === "R"){
      if(_self["direction"] === "Clockwise"){
        _self["direction"] = "Counterclockwise";
      }else{
        _self["direction"] = "Clockwise";
      }
    }

    // ### EFFECTS END ###

    var Discard = "";
    if(CARD_TOP[1] === "W" || CARD_TOP[1] === "F"){
      Discard = CARD_TOP[1];
    }else{
      Discard = CARD_TOP.join("");
    }
    _self["DiscardPile"].unshift(Discard); // Add to front current TopCard

    // Check if it is a wild card
    if(CARD_OBJ[1] === "W" || CARD_OBJ[1] === "F"){
      if( metadata === "red"){ CARD_OBJ[0] = "R"; }
      if( metadata === "blue"){ CARD_OBJ[0] = "B"; }
      if( metadata === "yellow"){ CARD_OBJ[0] = "Y"; }
      if( metadata === "green"){ CARD_OBJ[0] = "G"; }
    }
    _self["TopCard"] = CARD_OBJ.join("");

    //console.log("Discard: " + Discard);
    //console.log("New TopCard is: " + _self["TopCard"]);

    io.to('table-'+_self["name"]).emit('new_card_on_table', _self["TopCard"], generate_random_card_position());
    _self["PlayerHands"][player_index].splice(card_index, 1);

    var card_color = UnoEngine.MnemonicColor(CARD_OBJ[0]);
    var card_name = UnoEngine.MnemonicNumber(CARD_OBJ[1]);
    io.to('table-'+_self["name"]).emit('game_message', ""+_self["players"][player_index]["nick"]+" played "+card_color+" "+card_name+" ");

    for(var i=0; i<_self["PlayerHands"].length; i++){
      io.to('user-'+_self["players"][i]["id"]).emit('player_hand', _self["PlayerHands"][i]);
      io.to('user-'+_self["players"][i]["id"]).emit('player_you', i);

      io.to('table-'+_self["name"]).emit('player_card_number', {"index": i, "num": _self["PlayerHands"][i].length});

      // Check for win
      if(_self["PlayerHands"][i].length === 0){

        if(CARD_OBJ[1] !== "F" && CARD_OBJ[1] !== "W"){
          announce_winner();
          reset_the_game();
          return;
        }else{
          draw_n_cards( 2, player_index );
        }

      }
    }

    // Zero switch players cards
    if(CARD_OBJ[1] === "0"){
      if( typeof metadata === "string"){
        if(metadata.match(/^[0-9]{1,3}$/ig)){
          var pl_index = parseInt(metadata, 10);
          if(pl_index >= 0 && pl_index < _self["PlayerHands"].length){
            var temp_hand = _self["PlayerHands"][player_index];
            _self["PlayerHands"][player_index] = _self["PlayerHands"][pl_index];
            _self["PlayerHands"][pl_index] = temp_hand;

            io.to('table-'+_self["name"]).emit('game_message', ""+_self["players"][player_index]["nick"]+" switched cards with "+_self["players"][pl_index]["nick"]+"");
          }
        }
      }
    }
    for(var i=0; i<_self["PlayerHands"].length; i++){
      io.to('user-'+_self["players"][i]["id"]).emit('player_hand', _self["PlayerHands"][i]);
      io.to('table-'+_self["name"]).emit('player_card_number', {"index": i, "num": _self["PlayerHands"][i].length});
    }

    // Next Player should play
    nextPlayer();
    EmitTableStatus();
  };

  // Player draws a card
  _self["Draw"] = function(player_index){
    if(player_index !== _self["player_turn"]){ return; }

    if(_self["CanDraw"] === false){
      // Check if penalty is stacking
      if(_self["stack_plus_2"] > 0){
        draw_n_cards( _self["stack_plus_2"], _self["player_turn"] );
        _self["stack_plus_2"] = 0;
      }

      if(_self["stack_plus_4"] > 0){
        draw_n_cards( _self["stack_plus_4"], _self["player_turn"] );
        _self["stack_plus_4"] = 0;
      }

      // Next Player should play
      nextPlayer();
      EmitTableStatus();
      return;
    }
    
    // He can draw only once, and to not change the player
    _self["CanDraw"] = false;

    // Draw
    draw_n_cards( 1, player_index );
    
    for(var i=0; i<_self["PlayerHands"].length; i++){
      io.to('user-'+_self["players"][i]["id"]).emit('player_hand', _self["PlayerHands"][i]);
      io.to('user-'+_self["players"][i]["id"]).emit('player_you', i);

      io.to('table-'+_self["name"]).emit('player_card_number', {"index": i, "num": _self["PlayerHands"][i].length});
    }
  };

  // ### END Main commands ###

  function draw_n_cards(n, player_index){
      for(var x=0; x < n; x++){
        
        if(_self["DECK"].length === 0){
          // Shit!!! We are out of cards...
          nonce += 1; // Increase nonce by 1
          var Shuffle_OBJ = PF.shuffle( _self["DiscardPile"].join(","), sseed, cseed+":"+nonce );
          _self["DECK"] = Shuffle_OBJ.reshuffled.split(","); // Solved the BUG!!! .split(",") BECAUSE reshuffled is returned as string.
          _self["DiscardPile"] = [];
          io.to('table-'+_self["name"]).emit('put_deck_on_table', _self["DECK"].length);
        }

        var TotalNumberOfCardsInHands = 0;
        for(var j = 0; j < _self["PlayerHands"].length; j++){
          TotalNumberOfCardsInHands += _self["PlayerHands"][j].length;
        }

        // Check if players have max cards in hands 105, then don't draw.
        if(TotalNumberOfCardsInHands <= 105){
          // Deal from top of the current deck
          var Dealing_Top_OBJ = UnoEngine.DealCard(_self["DECK"]);
          var CurrentTopCard = Dealing_Top_OBJ.TopCard; // Get the current card.
          _self["DECK"] = Dealing_Top_OBJ.NewDeck; // New deck is set.

          _self["PlayerHands"][player_index].push(CurrentTopCard);

          io.to('table-'+_self["name"]).emit('new_draw');
        }

      }

      // Whenever you draw you should emit new deck to hands of players
      for(var i=0; i<_self["PlayerHands"].length; i++){
        io.to('user-'+_self["players"][i]["id"]).emit('player_hand', _self["PlayerHands"][i]);
        io.to('table-'+_self["name"]).emit('player_card_number', {"index": i, "num": _self["PlayerHands"][i].length});
      }
  }

  var announce_winner = function(){
    var Winner = {};
    // Emit lost and win events
    for(var i=0; i<_self["PlayerHands"].length; i++){
      if(_self["PlayerHands"][i].length === 0){
        Winner = _self["players"][i];
        io.to('user-'+_self["players"][i]["id"]).emit('win', i);
      }else{
        io.to('user-'+_self["players"][i]["id"]).emit('lost');
      }
    }

    console.log("At table: "+_self["full_name"]+" | Game winner: "+Winner["nick"]+" | Total players: "+_self["PlayerHands"].length);
    io.to('table-'+_self["name"]).emit('game_message', ""+Winner["nick"]+" won!");
  };

  var reset_the_game = function(){
    // Start reseting
    _self["time_left"] = _self["time_wait_for_start"];
    EmitTimeChange(_self["time_reaction"]);

    _self["game_mode"] = 0;
    _self["game_status"] = "Open";
    _self["players"] = [];
    _self["dealer"] = "Unknown";
    _self["player_turn"] = "Unknown";
    _self["direction"] = "Unknown";

    _self["stack_plus_2"] = 0;
    _self["stack_plus_4"] = 0;

    _self["PlayerHands"] = [];
    _self["DECK"] = [];
    _self["TopCard"] = "";
    _self["DiscardPile"] = [];

    _self["CanDraw"] = true;

    nonce = 0;
    sseed = RandomModule.GenerateRandomString();
    cseed = "777-777";

    // First shuffle
    hash = PF.fingerprint(sseed + UnoDeck.join(","));
    _self["hash"] = hash;

    io.to('table-'+_self["name"]).emit('put_deck_on_table', 0);
    io.to('table-'+_self["name"]).emit('player_list', []);
    io.to('table-'+_self["name"]).emit('player_hand', []);
    io.to('table-'+_self["name"]).emit('game_end');
    io.to('table-'+_self["name"]).emit('sync_time', {"percentage": 0, "text": "0", "color": "#ea003d"} );

    EmitTableStatus();
  };

  var generate_random_card_position = function(){
    var rand_deg = RandomModule.getRandomInt(0, 90);
    var rand_sign = "+";
    if(RandomModule.getRandomInt(1, 2) === 2){rand_sign = "-";}
    var left = RandomModule.getRandomInt(60, 106);  // 88
    var top = RandomModule.getRandomInt(190, 265); // 215

    return {"rand_sign": rand_sign, "rand_deg": rand_deg, "left": left, "top": top};
  };

  var start_the_game = function(){
    _self["time_left"] = _self["time_reaction"];
    EmitTimeChange(_self["time_reaction"]);

    var Shuffle_OBJ = PF.shuffle( UnoDeck.join(","), sseed, cseed+":"+nonce );

    var Dealing_OBJ = UnoEngine.DealCardsToPlayers( Shuffle_OBJ.reshuffled.split(","), _self["players"].length);
    _self["DECK"] = Dealing_OBJ.NewDeck;

    _self["PlayerHands"] = Dealing_OBJ.PlayerHands;

    /*
    console.log(" - Player Cards: ");
    console.log(_self["PlayerHands"]);
    console.log(" - New UNO deck after dealing: " + _self["DECK"]);
    */

    var Dealing_Top_OBJ = UnoEngine.DealCard(_self["DECK"]);
    _self["TopCard"] = Dealing_Top_OBJ.TopCard;
    _self["DECK"] = Dealing_Top_OBJ.NewDeck;

    /*
    console.log(" - Dealing TopCard: " + _self["TopCard"]);
    console.log(" - New UNO deck after dealing: " + _self["DECK"]);
    console.log();
    */
  
    _self["game_status"] = "Playing";
    _self["dealer"] = RandomModule.getRandomInt(1, _self["players"].length) - 1;
    _self["player_turn"] = _self["dealer"];

    _self["direction"] = "Clockwise";

    // ### EFFECTS ###
    var CARD_OBJ = UnoEngine.ParseCard(_self["TopCard"]);

    // Draw 4
    if(CARD_OBJ[1] === "F"){
      _self["stack_plus_4"] += 4;
    }

    // Draw 2
    if(CARD_OBJ[1] === "D"){
      _self["stack_plus_2"] += 2;
    }

    // Skip
    if(CARD_OBJ[1] === "S"){
      // Next Player should play
      var Clockwise_Bool;
      if(_self["direction"] === "Clockwise"){ Clockwise_Bool = true; }else{ Clockwise_Bool = false; }
      _self["player_turn"] = UnoEngine.NextPlayer(_self["player_turn"], _self["players"].length, Clockwise_Bool);
    }

    // Rotation
    if(CARD_OBJ[1] === "R"){
      if(_self["direction"] === "Clockwise"){
        _self["direction"] = "Counterclockwise";
      }else{
        _self["direction"] = "Clockwise";
      }
    }
    // ### EFFECTS END ###

    for(var i=0; i<_self["PlayerHands"].length; i++){
      io.to('user-'+_self["players"][i]["id"]).emit('player_hand', _self["PlayerHands"][i]);
      io.to('user-'+_self["players"][i]["id"]).emit('player_you', i);

      io.to('table-'+_self["name"]).emit('player_card_number', {"index": i, "num": _self["PlayerHands"][i].length});
    }
    io.to('table-'+_self["name"]).emit('new_card_on_table', _self["TopCard"], generate_random_card_position());
    io.to('table-'+_self["name"]).emit('put_deck_on_table', _self["DECK"].length);

    io.to('table-'+_self["name"]).emit('game_message', "Game started, good luck!");

    EmitPlayerTurn();

    EmitTableStatus();
  };

  var EmitTableStatus = function() {
    var dealer = "Unknown";
    var player = "Unknown";
    if(typeof _self["dealer"] === "number"){
      dealer = _self["players"][ _self["dealer"] ]["nick"];
    }
    if(typeof _self["player_turn"] === "number"){
      player = _self["players"][ _self["player_turn"] ]["nick"];
    }
    io.to('table-'+_self["name"]).emit('table_status', {
      "game_status": _self["game_status"],
      "spectators": _self["spectators"],
      "players": _self["players"].length,
      "max_players": _self["max_players"],
      "dealer": dealer,
      "player_turn": player,
      "direction": _self["direction"]
    });
  };

  var EmitPlayerTurn = function() {
    io.to('table-'+_self["name"]).emit('player_turn', _self["player_turn"]);
    for(var i=0; i<_self["players"].length; i++){
      if(_self["player_turn"] === i){ io.to('user-'+_self["players"][i]["id"]).emit('your_turn'); }
    }
  };

  var nextPlayer = function(){
    var Clockwise_Bool;
    if(_self["direction"] === "Clockwise"){ Clockwise_Bool = true; }else{ Clockwise_Bool = false; }
    _self["player_turn"] = UnoEngine.NextPlayer(_self["player_turn"], _self["players"].length, Clockwise_Bool);

    _self["time_left"] = _self["time_reaction"];
    _self["CanDraw"] = true;

    EmitPlayerTurn();

    // If player is offline, his time for reaction should be 0, so we automaticly skip to another player.
    if( _self["players"][_self["player_turn"]]["online"] === false ){ _self["time_left"] = 0; }

    EmitTimeChange(_self["time_reaction"]);
  };

  var turn_has_ended = function(){
    _self["time_left"] = _self["time_reaction"];
    EmitTimeChange(_self["time_reaction"]);

    // Check if he can draw the card before the end
    if(_self["CanDraw"] === true){
      _self["Draw"](_self["player_turn"]); // Draw the card
    }

    // Check if penalty is stacking
    if(_self["stack_plus_2"] > 0){
      draw_n_cards( _self["stack_plus_2"], _self["player_turn"] );
      _self["stack_plus_2"] = 0;
    }

    if(_self["stack_plus_4"] > 0){
      draw_n_cards( _self["stack_plus_4"], _self["player_turn"] );
      _self["stack_plus_4"] = 0;
    }

    // Next Player should play
    nextPlayer();
    EmitTableStatus();
  };

  // Time stuff...

  // Sync Time Emit
  var EmitTimeChange = function(of_total){
    var total = of_total || _self["time_wait_for_start"];
    var percentage = _self["time_left"] / total;
    io.to('table-'+_self["name"]).emit('sync_time', {"percentage": percentage, "text": _self["time_left"], "color": "#ea003d"} );
  };

  // Sync
  var update = function(){
    if (_self["game_mode"] === 0){ return; } // On Game mode 0 (OPEN) Time does not go
    
    _self["time_left"] -= 1; // Time decreases every second

    if (_self["game_mode"] === 1 && _self["time_left"] < 0) { _self["game_mode"] = 2; start_the_game(); return; }

    if (_self["game_mode"] === 2 && _self["time_left"] < 0) { turn_has_ended(); return; }

    // Emit Sync
    if (_self["game_mode"] === 1){ EmitTimeChange(_self["time_wait_for_start"]); }
    if (_self["game_mode"] === 2){ EmitTimeChange(_self["time_reaction"]); }
  };
  setInterval(update, 1000);
};

// ####### TABLE DYNAMIC END #######