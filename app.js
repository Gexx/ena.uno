/*
 .----------------.  .-----------------. .----------------.   .----------------.  .-----------------. .----------------. 
| .--------------. || .--------------. || .--------------. | | .--------------. || .--------------. || .--------------. |
| |  _________   | || | ____  _____  | || |      __      | | | | _____  _____ | || | ____  _____  | || |     ____     | |
| | |_   ___  |  | || ||_   \|_   _| | || |     /  \     | | | ||_   _||_   _|| || ||_   \|_   _| | || |   .'    `.   | |
| |   | |_  \_|  | || |  |   \ | |   | || |    / /\ \    | | | |  | |    | |  | || |  |   \ | |   | || |  /  .--.  \  | |
| |   |  _|  _   | || |  | |\ \| |   | || |   / ____ \   | | | |  | '    ' |  | || |  | |\ \| |   | || |  | |    | |  | |
| |  _| |___/ |  | || | _| |_\   |_  | || | _/ /    \ \_ | | | |   \ `--' /   | || | _| |_\   |_  | || |  \  `--'  /  | |
| | |_________|  | || ||_____|\____| | || ||____|  |____|| | | |    `.__.'    | || ||_____|\____| | || |   `.____.'   | |
| |              | || |              | || |              | | | |              | || |              | || |              | |
| '--------------' || '--------------' || '--------------' | | '--------------' || '--------------' || '--------------' |
 '----------------'  '----------------'  '----------------'   '----------------'  '----------------'  '----------------' 
                                         ___.                  __                      .___
  ______ ______________  __ ___________  \_ |__ _____    ____ |  | __ ____   ____    __| _/
 /  ___// __ \_  __ \  \/ // __ \_  __ \  | __ \\__  \ _/ ___\|  |/ // __ \ /    \  / __ | 
 \___ \\  ___/|  | \/\   /\  ___/|  | \/  | \_\ \/ __ \\  \___|    <\  ___/|   |  \/ /_/ | 
/____  >\___  >__|    \_/  \___  >__|     |___  (____  /\___  >__|_ \\___  >___|  /\____ | 
     \/     \/                 \/             \/     \/     \/     \/    \/     \/      \/ 
*/

// ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ###

// Loading all dependencies
var express = require('express');
var app     = require('express')();
var http    = require('http').Server(app);
var io      = require('socket.io')(http);
var fs      = require('fs');
var ARGS    = require('shell-arguments');
var pgp     = require('pg-promise')();

// ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ###

// Loading config data
var CONFIG = require('./config.js');

// ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ###

// Connecting to the Postgres database...
var db = pgp( CONFIG["database"]["connectionString"] );

// ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ###

// System flags
var DEBUG_MODE = 0;

// Checking arguments
if(ARGS.testnet || ARGS.test || ARGS.t){
  console.log("!!!TEST MODE!!!");
  DEBUG_MODE = 1;
}

if(ARGS.help || ARGS.h){
  console.log("### HELP ###");
  console.log(" -h, --help            | Shows only help and stops the program.");
  console.log(" -t, --test, --testnet | Starts Ena.Uno in a test mode.");
  process.exit(0);
  return;
}

// ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ###

// Load Game Dynamic
var EnaGame = require('./parts/ena-game-table.js');

// List of all tables
var TableList = [];
TableList.push( new EnaGame("normal", "Normal", io, db) );
TableList.push( new EnaGame("nadja", "U bircu kod Nadje", io, db) );
TableList.push( new EnaGame("plaza", "Plaža Redagara", io, db) );
TableList.push( new EnaGame("drazica", "Plaža Dražica", io, db) );
TableList.push( new EnaGame("svemir", "Svemir", io, db) );
TableList.push( new EnaGame("bitcoin", "Na kavi kod Satoshia", io, db) );
TableList.push( new EnaGame("apaslab", "Riteh APASLab", io, db) );

function FindTableByName(name, TableList){
  var index = -1;
  for(var i=0; i < TableList.length; i++){
    if(TableList[i]["name"] === name){ index = i; }
  }
  return index;
}
function FindPlayerById(id, PlayersList){
  var index = -1;
  for(var i=0; i < PlayersList.length; i++){
    if(PlayersList[i]["id"] === id){ index = i; }
  }
  return index;
}
function FindPlayerByNick(nick, PlayersList){
  var index = -1;
  for(var i=0; i < PlayersList.length; i++){
    if(PlayersList[i]["nick"] === nick){ index = i; }
  }
  return index;
}
// Should prepare data to send info about Tables
function TableDataSafeToSend(TL) {
  var NewTableDataToSend = [];
  for(var i=0; i < TL.length; i++){
    NewTableDataToSend.push({
      "name": TL[i]["name"],
      "full_name": TL[i]["full_name"],
      "spectators": TL[i]["spectators"],
      "game_status": TL[i]["game_status"],
      "hash": TL[i]["hash"],
      "players": TL[i]["players"].length,
      "max_players": TL[i]["max_players"]
    });
  }
  return NewTableDataToSend;
}

// Send update info every 3 seconds...
setInterval(function() {
  io.emit('update_tables_data', TableDataSafeToSend(TableList));
}, 3000);

// ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ###

// Static content and routes
app.use(express.static('public'));

// Routing, but not needed in this game... Static content is enough :)
/*
app.get('/help', function (req, res) {
  res.send('Help...');
});
*/

app.get('/api/v1/tables', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send( JSON.stringify( TableDataSafeToSend(TableList), null, 2 ) );
});

app.get('/api/v1/history', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send( JSON.stringify('Games history...', null, 2 ) );
});

// Handling error 404
app.use(function(req, res, next) {
  res.status(404).sendFile(__dirname + '/public/404.html'); //res.status(404).send('Sorry can\'t find that!');
});

// ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ###

var random_module = require('./parts/random-module.js');
var random_name_generator  = require('./parts/random-name-generator.js');

// ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ###

var authTries = {};
var registrationTries = {};
var IP_BlackList = {};

// Handle socket connections
var UsersOnline = 0;
io.on('connection', function(socket){

  // Send the game info
  function Msg(str){ socket.emit('message', str); }
  function Err(str){ socket.emit('err', str); }
  Msg('Connected, welcome!');

  // Check for IP block
  function GetTheIP(){ return socket.client.request.headers['cf-connecting-ip'] || socket.request.connection.remoteAddress; }
  var ip = GetTheIP();
  if(typeof IP_BlackList[ip] !== "undefined"){
    if( Math.round(+new Date()/1000) <= IP_BlackList[ip] ){ Err('It seems you have been banned, sorry for that... Contact admin for more info.'); return; }else{ delete IP_BlackList[ip]; }
  }

  // Increment users online and emit to all new data
  UsersOnline += 1;
  io.emit('users_online', UsersOnline );

  // ### USER DYNAMIC ###
  // EVERY SOCKET ON CONNECT IS NOT AUTHENTICATED, USER_ID = -1
  var USER_ID = -1; // <<-- MOST IMPORTANT PART for socket session auth...

  socket.emit("auth_request");

  var registrationInProgress = false;
  socket.on('register', function(){
    if(USER_ID !== -1){ Err('You can\'t register while logged in another account.'); return; }
    if(registrationInProgress === true){ Err('Account registration is in progress...'); return; }else{ registrationInProgress = true; }

    if(typeof registrationTries[ip] === 'undefined'){ registrationTries[ip] = 0;} // IP is trying to log for a first time.
    if( parseInt(registrationTries[ip], 10) >= 7){
      registrationTries[ip] = 0;
      IP_BlackList[ip] = Math.round(+new Date()/1000) + 3600;
      socket.disconnect();
      return;
    }else{
      registrationTries[ip]++;
    }

    Msg('Trying to register new account...');
    var new_nick = random_name_generator.getRandomName();
    var new_token = random_module.SHA256( random_module.GenerateRandomString(128) );

    db.one("INSERT INTO users (nick, token) values ($1, $2) returning id", [new_nick, new_token])
      .then(function (data) {
        registrationInProgress = false;
        socket.emit('registration', new_token);
        console.log("Created new user: ("+data["id"]+") <"+new_nick+">");

          // Clear registration limit every 30 sec
          setTimeout(function(){
            if(typeof registrationTries[ip] === 'undefined'){ return; }
            registrationTries[ip]--;
            if(registrationTries[ip] <= 0){ delete registrationTries[ip]; }
          }, 30 * 1000);
      })
      .catch(function (error) {
        registrationInProgress = false;
        console.log("ERROR:", error.message || error);
        Err('Error while creating new user...');
      });
  });

  // Authenticate with server
  var authInProgress = false;
  socket.on('auth', function(hash){
    if(typeof hash !== 'string'){ Err('Auth hash should be a string type...'); return; }
    if(!hash.match(/^[0-9a-z]{20,256}$/gi)){ Err('You are joking right? Hash is invalid.'); return; }
    if(authInProgress === true){ Err('Auth is in progress...'); return; }else{ authInProgress = true; }

    if(typeof authTries[ip] === 'undefined'){ authTries[ip] = 0;} // IP is trying to log for a first time.
    if( parseInt(authTries[ip], 10) >= 7){
      authTries[ip] = 0;
      IP_BlackList[ip] = Math.round(+new Date()/1000) + 3600;
      socket.disconnect();
      return;
    }

    //Msg('Authenticating...');

    db.one("SELECT * FROM users WHERE token=$1 AND username IS NULL AND password IS NULL LIMIT 1", [ hash ])
      .then(function (user_data) {
        authInProgress = false;
        ProcessSuccessfulLogin(user_data);
      })
      .catch(function (error) {
        authInProgress = false;
        //console.log('Error AUTH', 'Can\'t fetch users data...', error);
        Err('Invalid auth hash, failing to auth too many times causes ban!');
        authTries[ip]++;

        socket.emit('clear_token', true);

        // Clear registration limit every 30 sec
        setTimeout(function(){
          if(typeof authTries[ip] === 'undefined'){ return; }
          authTries[ip]--;
          if(authTries[ip] <= 0){ delete authTries[ip]; }
        }, 30 * 1000);

        return;
      });
  });

  var loginInProgress = false;
  socket.on('login', function(user, pass, fa_code){
    if(typeof user !== 'string'){ Err('Username value should be a string type...'); return; }
    if(typeof pass !== 'string'){ Err('Password value should be a string type...'); return; }
    if(typeof fa_code !== 'string'){ Err('2FA value should be a string type...'); return; }

    if(!user.match(/^[a-z0-9\_\s\-\.\$\#\!]{1,256}$/gi)){ Err('Username should be between [1, 256] and no special chars...'); return; }
    if(!pass.match(/^.{1,256}$/gi)){ Err('Password should be between [1, 256] chars...'); return; }
    if(fa_code !== ''){
      if(!fa_code.match(/^[0-9]{6}$/gi)){ Err('2FA should consist of 6 numbers...'); return; }
    }

    if(loginInProgress === true){ Err('Login is in progress...'); return; }else{ loginInProgress = true; }

    if(typeof authTries[ip] === 'undefined'){ authTries[ip] = 0;} // IP is trying to log for a first time.
    if( parseInt(authTries[ip], 10) >= 7){
      authTries[ip] = 0;
      IP_BlackList[ip] = Math.round(+new Date()/1000) + 3600;
      socket.disconnect();
      return;
    }

    //Msg('Login in progress...');
    var password_hash = random_module.SHA256( CONFIG["database"]["salt"]["prefix"] + pass + CONFIG["database"]["salt"]["sufix"]);
    //console.log("Pass:", pass, "SALTED HASH:", password_hash); // REMOVE THIS

    db.one("SELECT * FROM users WHERE username=$1 AND password=$2 AND token IS NULL LIMIT 1", [ user, password_hash ])
      .then(function (user_data) {
        loginInProgress = false;
        // CHECK FOR 2FA HERE
        ProcessSuccessfulLogin(user_data);
      })
      .catch(function (error) {
        loginInProgress = false;
        console.log('Error LOGIN', 'Can\'t fetch users data...');
        Err('Invalid login data, failing to login too many times causes ban!');
        authTries[ip]++;

        socket.emit('clear_token', false);
          // Clear registration limit every 30 sec
          setTimeout(function(){
            if(typeof authTries[ip] === 'undefined'){ return; }
            authTries[ip]--;
            if(authTries[ip] <= 0){ delete authTries[ip]; }
          }, 30 * 1000);

        return;
      });
  });

  function ProcessSuccessfulLogin(user_data) {
    USER_ID = user_data["id"];

    // Adding user to specific groups
    socket.join('uid_'+user_data["id"]);
    if(user_data["status"] === 'admin' || user_data["status"] === 'moderator'){
      socket.join('moderators');
      //socket.emit('cached_chat', ModChatData);
    }else{
      //socket.emit('cached_chat', ChatData);
    }

    nick = user_data["nick"];

    var Safe_To_Output = {};
    Safe_To_Output["id"] = user_data["id"];
    Safe_To_Output["nick"] = user_data["nick"];
    Safe_To_Output["hash"] = user_data["token"];

    Msg('Logged in as ('+user_data["id"]+') &lt;'+user_data["nick"]+'&gt; ');
    socket.emit("user_data", Safe_To_Output);

    // Check if the user is already playing on some table we need to initiate reconnecting procedure...
    var player_index = -1;
    for(var i = 0; i < TableList.length; i++){
      player_index = FindPlayerById(USER_ID, TableList[i]["players"]);
      if(player_index !== -1){
        // We have found the player on successful reconnect...
        Msg("You are in game... players are waiting for you!!!");
        table = TableList[i]["name"];
        nick = TableList[i]["players"][player_index]["nick"];
        TableList[i]["players"][player_index]["online"] = true;
        EnterTable();
        socket.emit('sit_success');
        TableList[i]["PlayerReconnected"](player_index);
      }
    }
  }

  socket.on('logout', function(){
    if(USER_ID === -1){ Err('You can logout only when you have logged in first... duh..'); return; }
    socket.leave('uid_'+USER_ID);
    socket.leave('moderators');
    Msg('Logging you out...');
    USER_ID = -1;
    socket.emit('logout');
  });

  // ### GAME DYNAMIC ###
  var id = "";
  var nick = "";
  var table = "";
  var spectating_table = false;

  // Send table data, but careful, send only what is safe to send.
  socket.emit('tables_data', TableDataSafeToSend(TableList));

  // Entering table (We have Nick and Table)
  function EnterTable(){
    if(table !== "" && nick !== "" && spectating_table === false){
      spectating_table = true;

      socket.emit('enter_table', table);
      socket.join('user-'+USER_ID);
      socket.join('table-'+table);

      // First we need to select the table
      var table_index = FindTableByName(table, TableList);
      if(table_index === -1){ Err('Strange... that table does not exist...'); return; }

      TableList[table_index].AddSpectator();

      // Send all data when spectator joined.
      var EmitPlayerList = function(Table){
        var data_to_send = Table["players"];
        for(var i=0; i < Table["players"].length; i++){
          if(Table["PlayerHands"][i]){
            data_to_send[i]["cards"] = Table["PlayerHands"][i].length;
          }else{
            data_to_send[i]["cards"] = 0;
          }
        }
        socket.emit('player_list', data_to_send);
        socket.emit('player_turn', Table["player_turn"]);

        var player_index = FindPlayerById(USER_ID, Table["players"]);
        if(player_index !== -1){ socket.emit('player_you', player_index); }
      };
      EmitPlayerList(TableList[table_index]);

      var EmitTableStatus = function(Table) {
        var dealer = "Unknown";
        var player = "Unknown";
        if(typeof Table["dealer"] === "number"){
          dealer = Table["players"][ Table["dealer"] ]["nick"];
        }
        if(typeof Table["player_turn"] === "number"){
          player = Table["players"][ Table["player_turn"] ]["nick"];
        }
        socket.emit('table_status', {
          "game_status": Table["game_status"],
          "players": Table["players"].length,
          "max_players": Table["max_players"],
          "dealer": dealer,
          "player_turn": player,
          "direction": Table["direction"]
        });
      };
      EmitTableStatus(TableList[table_index]);

      var EmitDeck = function(Table) {
        for(var i=0; i<Table["DiscardPile"]; i++){
          socket.emit('new_card_on_table', Table["DiscardPile"][i]);
        }
        if(Table["TopCard"] !== ""){
          socket.emit('new_card_on_table', Table["TopCard"]);
        }
        socket.emit('put_deck_on_table', Table["DECK"].length);
      };
      EmitDeck(TableList[table_index]);

    }
  }

  // Update nick, check if it is string, and if it is AlphaNumeric{1,16}
  socket.on('set_nick', function(nick_str){
    if(typeof nick_str !== "string"){ Err('Nick is not a string...'); return; }
    if(!nick_str.match(/^[a-z0-9]{1,16}$/ig)){ Err('Nick is not a valid string...'); return; }

    if(USER_ID === -1){ Err('You have to authenticate in order to change nickname...'); return; }

    if(nick !== nick_str){
      
      // Update bets
      db.none('UPDATE "users" SET "nick"=$1 WHERE "id"=$2', [ nick_str, USER_ID ])
        .then(function () {
          nick = nick_str;
          socket.emit('message', "Nick updated...");
          console.log("User ID:", USER_ID, "changed his nickname to", nick_str );

          EnterTable();
        })
        .catch(function (error) {
          nick = "";
          console.log("[ERROR] Can't update nick - User ID:", USER_ID );
        });

    }
  });

  // Update table, check if it is string
  socket.on('set_table', function(table_str){
    if(typeof table_str !== "string"){ Err('Table data is not a string...'); return; }
    if(!table_str.match(/^[a-z0-9]{1,16}$/ig)){ Err('Table data is not a valid string...'); return; }

    var table_index = FindTableByName(table_str, TableList);
    if(table_index === -1){ Err('That table does not exist...'); return; }

    if(USER_ID === -1){ Err('You have to authenticate in order to select table...'); return; }

    // Check if he is already in a valid table but trying to directly switch without leaving first
    if(spectating_table === true){ Err('Hmm... you are trying to spectate more than one table at the time...'); return; }

    // Check if the user is already playing on some table we need to disable switching of tables...
    var player_index = -1;
    for(var i = 0; i < TableList.length; i++){
      player_index = FindPlayerById(USER_ID, TableList[i]["players"]);
      if(player_index !== -1){
        // We have found the player
        Err('You can\'t select table because you are already playing at one...');
        return;
      }
    }

    table = table_str;
    //socket.emit('message', "Table selected...");

    EnterTable();
  });

  // Player wants to sit
  socket.on('sit', function(){
    if(table === "" || nick === ""){ Err('Can\'t sit. You need to set table and nick first.'); return; }
    
    // First we need to select the table
    var table_index = FindTableByName(table, TableList);
    if(table_index === -1){ Err('Strange... that table does not exist...'); return; }

    if(USER_ID === -1){ Err('You have to authenticate in order to sit at the table...'); return; }

    // We need to check if guy is not already sitting at the table && if table is not full or in game
    if( TableList[table_index]["game_mode"] === 2 ){ Err('You are trying to join table while game is on...'); return; }
    if( TableList[table_index]["players"].length >= TableList[table_index]["players"]["max_players"] ){ Err('You are trying to join full table...'); return; }

    // Check if the user is already playing on some table we need to disable switching of tables...
    var player_index = -1;
    for(var i = 0; i < TableList.length; i++){
      player_index = FindPlayerById(USER_ID, TableList[i]["players"]);
      if(player_index !== -1){
        // We have found the player
        Err('You are trying to join a table, but you have already joined...');
        return;
      }
    }

    Msg('Congrats! You have joined a table '+table+'.');
    socket.emit('sit_success');

    TableList[table_index].AddPlayer( {"id": USER_ID, "nick": nick, "online": true} );
  });

  // Player wants to leave
  socket.on('leave', function(){
    if(table === "" || nick === ""){ Err('Can\'t leave. You need to set table and nick first.'); return; }
    if(spectating_table === false){ Err('You are trying to leave, but you are not in... heh...'); return; }

    // First we need to select the table
    var table_index = FindTableByName(table, TableList);
    if(table_index === -1){ Err('Strange... that table does not exist...'); return; }

    if(USER_ID === -1){ Err('You have to authenticate in order to leave table...'); return; }

    // Check if user is already playing
    var player_index = FindPlayerById(USER_ID, TableList[table_index]["players"]);
    if( player_index !== -1 ){ Err('You are trying to leave a table, but you are playing...'); return; }

    TableList[table_index].RemoveSpectator();
    socket.leave('table-'+table);

    table = "";
    spectating_table = false;

    socket.emit('leave_success');
  });

  // Player wants to draw card
  socket.on('play', function(num, metadata){
    if(typeof num !== "string"){ Err('Play data is not string...'); return; }
    if(!num.match(/^[0-9]{1,3}$/ig)){ Err('Let\'s be serious, this data should be numeric. In range [0, 108]'); return; }

    if(metadata){
      if(typeof metadata !== "string"){ Err('Metadata like color or player_index, is not string...'); return; }
      if(!num.match(/^[a-z0-9]{1,256}$/ig)){ Err('Let\'s be serious, this data is strange...'); return; }
    }else{
      metadata = null;
    }

    if(table === "" || nick === ""){ Err('Can\'t play. You need to set table and nick first.'); return; }
    var index = parseInt(num, 10);

    // First we need to select the table
    var table_index = FindTableByName(table, TableList);
    if(table_index === -1){ Err('Strange... that table does not exist...'); return; }

    if(USER_ID === -1){ Err('You have to authenticate in order to play...'); return; }

    // Find player index
    var player_index = FindPlayerById(USER_ID, TableList[table_index]["players"]);
    if( player_index === -1 ){ Err('Come on, you are not playing at that table...'); return; }

    // Check if the card he is trying to play exists in a deck
    if( typeof TableList[table_index]["PlayerHands"][player_index] === "undefined" ){ Err('Wooohoo... 1337 Haxorz here ? Cool, nice to meet ya\' '); return; }
    if( typeof TableList[table_index]["PlayerHands"][player_index][index] === "undefined" ){ Err('Wooohoo... 1337 Haxorz here ? Cool, nice to meet ya\' '); return; }

    TableList[table_index].Play(player_index, index, metadata);
  });

  // Player wants to draw card
  socket.on('draw', function(){
    if(table === "" || nick === ""){ Err('Can\'t draw. You need to set table and nick first.'); return; }
    
    // First we need to select the table
    var table_index = FindTableByName(table, TableList);
    if(table_index === -1){ Err('Strange... that table does not exist...'); return; }

    if(USER_ID === -1){ Err('You have to authenticate in order to draw...'); return; }

    // Find player index
    var player_index = FindPlayerById(USER_ID, TableList[table_index]["players"]);
    if( player_index === -1 ){ Err('Come on, you are not playing at that table...'); return; }

    TableList[table_index].Draw(player_index);
  });

  socket.on('cmd', function(cmd){
    if(typeof cmd !== "string"){ Err('Command is not a string...'); return; }

    var commands = [
      {
        "name": "show banned",
        "func": function(cmd){
          Msg( JSON.stringify(IP_BlackList) );
        }
      },
      {
        "name": "show status",
        "func": function(cmd){
          Msg( "ok" );
        }
      }
    ];

    var cmd_index =  -1;
    for(var i = 0; i < commands.length; i++){
      if(commands[i]["name"] === cmd){
        cmd_index = i;
      }
    }
    if(cmd_index !== -1){
      commands[cmd_index]["func"](cmd);
    }else{
      Msg("Unknown command...");
    }
  });

  // ### GAME DYNAMIC END ###

  socket.on('ding', function(){
    Msg('Dinging back...');
  });

  socket.on('disconnect', function(){
    UsersOnline -= 1;
    io.emit('users_online', UsersOnline );

    // Check if he was a spectator on table so we can remove the spectator.
    function CheckIfHeWasASpectator(){
      if(table !== "" && spectating_table === true){
        // First we need to select the table
        var table_index = FindTableByName(table, TableList);
        if(table_index === -1){ Err('Strange... that table does not exist...'); return; }
        TableList[table_index].RemoveSpectator();
      }
    }
    CheckIfHeWasASpectator();

    // Check if he was a player
    function CheckIfHeWasAPlayer(){
      if(table !== "" && nick !== ""){
        var table_index = FindTableByName(table, TableList);
        if(table_index === -1){ Err('Strange... that table does not exist...'); return; }

        var player_index = FindPlayerById(USER_ID, TableList[table_index]["players"]);
        if( player_index === -1 ){ Err('You are not playing at that table...'); return; }

        TableList[table_index].PlayerLeft(player_index);
      }
    }
    CheckIfHeWasAPlayer();

  });
});

// ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ### ###

// Listen localy on specific port
var server_port = CONFIG["server"]["port"];
http.listen(server_port, /* '127.0.0.1', */ function(){
  console.log('Listening on port ' + server_port);
});