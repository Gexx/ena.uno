/*
	Client side App.js
*/

var socket = io();
				
function set_deck_to_table(){
	function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	} 
	var rand_deg = getRandomInt(0, 2);
	var rand_sign = "+";
	if(getRandomInt(1, 2) === 2){rand_sign = "-";}
	
	var left = getRandomInt(0,15);  // 88

	$('.card_table_deck').append('<span style="transform: rotate('+rand_sign+rand_deg+'deg); margin-left: -'+left+'px;" class="ena-card on-table card-special-back"></span>');
	
	if( $('.card_table_deck span').length >= 108 ){
		$('.card_table_deck span:first-child').remove();
	}
}

function set_card_to_table(card, position_data){
	function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	} 
	var rand_deg = getRandomInt(0, 90);
	var rand_sign = "+";
	if(getRandomInt(1, 2) === 2){rand_sign = "-";}
	
	var left = getRandomInt(60, 106);  // 88
	var top = getRandomInt(190, 265); // 215
	
	// Position data
	if(position_data){
		rand_sign = position_data.rand_sign || rand_sign;
		rand_deg = position_data.rand_deg || rand_deg;
		left = position_data.left || left;
		top = position_data.top || top;
	}
	
	function ParseSingleCard(card){
		var Card_OBJ = card.split("");
		if(Card_OBJ[0] === "W" || Card_OBJ[0] === "F"){
			Card_OBJ[1] = Card_OBJ[0];
			Card_OBJ[0] = "X";
		}

		var color;
		if(Card_OBJ[0] === "R"){ color = "red"; }
		if(Card_OBJ[0] === "B"){ color = "blue"; }
		if(Card_OBJ[0] === "G"){ color = "green"; }
		if(Card_OBJ[0] === "Y"){ color = "yellow"; }
		if(Card_OBJ[0] === "X"){ color = "special"; }
		
		var symbol = Card_OBJ[1];
		
		return {"card_string": card, "card_array": Card_OBJ, "color": color, "symbol": symbol };
	}
			
	card = ParseSingleCard(card);
	
	$('.card_table').append('<span style="transform: rotate('+rand_sign+rand_deg+'deg); left: -'+left+'px; top: -'+top+'px;" class="ena-card on-table card-'+card["color"]+'-'+card["symbol"]+'"></span>');
	
	if( $('.card_table span').length >= 30 ){ // Start removing bottom card after 30 cards
		$('.card_table span:first-child').remove();
	}
}

$(document).ready(function(e){

	Terminal.WrieLine('Connecting...');
	
	function show_game_message(str){
		AppendMessageToInfoBox("game", str);
		Terminal.WrieLine('Game message: ' + str);
	}
	function show_message(str){
		AppendMessageToInfoBox("info", str);
		Terminal.WrieLine('Server message: ' + str);
	}
	function show_error(str){
		AppendMessageToInfoBox("error", str);
		Terminal.WrieLine('Error: ' + str);
	}
	function total_users_update(users){
		$('.total-users').text(users);
	};

	var InfoBoxGarbageCollector;
	function AppendMessageToInfoBox(type, data){
		type = type || "info";
		data = data || "Test...";

		if( $('.info-box ul li').length >= 5 ){ $('.info-box ul li:first-child').remove(); }

		$(".info-box ul").append("\
			<li class=\"message "+type+"\">\
     		<div class=\"subject\">"+type+"</div>\
				<div class=\"content\">"+data+"</div>\
    	</li>\
		");

		clearInterval(InfoBoxGarbageCollector);
		InfoBoxGarbageCollector = setInterval( function(){
			$('.info-box ul li:first-child').fadeOut("slow", function() {
				$(this).remove();
				if( $('.info-box ul li').length === 0 ){ clearInterval(InfoBoxGarbageCollector); }
			});
		}, 2500);
	}
	
	socket.on('message', show_message);
	socket.on('err', show_error);
	socket.on('game_message', show_game_message);
	socket.on('users_online', total_users_update);
			
	socket.on('disconnect', function() {
		$('.status-online').removeClass('online');
		$('.status-online').addClass('offline');		
		leave_table();
	});
	socket.on('connect', function() {
		$('.status-online').removeClass('offline');
		$('.status-online').addClass('online');
	});

	// User stuff
	function register_or_auth_new_user(){
		if(typeof $.cookie('hash') !== "undefined"){
			if($.cookie('hash') !== ''){
				socket.emit('auth', $.cookie('hash'));	// Calling this more than 1 time in a 10 seconds causes ban! Be careful.
			}else{
																								// User visited the site but we need to auth him, probably by username and password.
			}
		}else{
			socket.emit('register');									// Calling this more than 1 time in a 10 seconds causes ban! Be careful.
		}
	}
	socket.on('auth_request', function () {
		register_or_auth_new_user();
	});
	socket.on('registration', function (token) {
		socket.emit('auth', token);
	});
	socket.on('clear_token', function (total) {
		if(total){
			$.cookie('hash', '', { expires: -3*365, path: '/' });
		}else{
			$.cookie('hash', '', { expires: 3*365, path: '/' });
		}
	});
	socket.on('user_data', function (data) {
		if(typeof data.hash !== 'undefined' && data.hash !== null){
			$.cookie('hash', data.hash, { expires: 3*365, path: '/' });
			$('.user_token').text(data.hash);
		}else{
			$.cookie('hash', '', { expires: 3*365, path: '/' });
		}

		//$('#user_id').text(data.id);
		$('#nick').val(data.nick);
	});
	socket.on('logout', function () {
		$.cookie('hash', '', { expires: -3*365, path: '/' });
	});

	function process_tables_data(TableList){
		$(".portal_table_wrap ul").html('');
		for(var i = 0; i < TableList.length; i++){
			$('.portal_table_wrap ul').append('\
				<li id="table-stats-'+i+'" data-name="'+TableList[i]["name"]+'">\
					<div class="table-thumb '+TableList[i]["name"]+'"></div>\
						<div class="portal_table_data">\
								<div>Table name: <span class="table-stats-name">'+TableList[i]["full_name"]+'</span></div>\
								<div>Players: <span class="table-stats-players">'+TableList[i]["players"]+'</span>/<span class="table-stats-max_players">'+TableList[i]["max_players"]+'</span></div>\
								<div>Spectators: <span class="table-stats-spectators">'+TableList[i]["spectators"]+'</span></div>\
								<div>Status: <span class="table-stats-game_status">'+TableList[i]["game_status"]+'</span></div>\
						</div>\
				</li>\
			\
			');
		}
		$(".portal_table_wrap ul li:first-child").click();
	};
	socket.on('tables_data', process_tables_data);
	
	function update_tables_data(TableList){
		for(var i = 0; i < TableList.length; i++){
			$('#table-stats-'+i+' .table-stats-name').text(TableList[i]["full_name"]);
			$('#table-stats-'+i+' .table-stats-players').text(TableList[i]["players"]);
			$('#table-stats-'+i+' .table-stats-max_players').text(TableList[i]["max_players"]);
			$('#table-stats-'+i+' .table-stats-spectators').text(TableList[i]["spectators"]);
			$('#table-stats-'+i+' .table-stats-game_status').text(TableList[i]["game_status"]);
		}
	};
	socket.on('update_tables_data', update_tables_data);
			
	// Add event to listen
	$(".portal_table_wrap ul").delegate("li", "click", function() {
		$(".portal_table_wrap ul li").removeClass('selected');
		$(this).addClass('selected');
		var table_selected = $(".portal_table_wrap ul li.selected").attr('data-name');
		$("body").removeClass();
		$("body").addClass(table_selected);
	});
	
	// Listen to get in events		
	$("#nick").keydown(function(e) {
		if ( e.which === 13 ) { // Enter
			socket.emit('set_nick', $("#nick").val());
			socket.emit('set_table', $(".portal_table_wrap ul li.selected").attr('data-name'));
			e.preventDefault();
		}
	});
	$("#btn_get_in").on("click", function() {
		socket.emit('set_nick', $("#nick").val());
		socket.emit('set_table', $(".portal_table_wrap ul li.selected").attr('data-name'));
	});
			
	// Success in entering the table
	function enter_table(table_name){
		$(".game_portal_center").hide();
		$(".players_holder").show();
		$(".table_status").show();
		$(".game_help").show();
		$(".game_mute").show();
		$(".card_table_center").show();
		$(".card_holder").show();
		$(".command_holder").show();
		
		$("body").removeClass();
		$("body").addClass(table_name);
	}
	socket.on('enter_table', enter_table);
	
	// Leave table
	function leave_table(){
		$(".game_portal_center").show();
		$(".players_holder").hide();
		$(".table_status").hide();
		$(".game_help").hide();
		$(".game_mute").hide();
		$(".card_table_center").hide();
		$(".card_holder").hide();
		$(".command_holder").hide();
		
		$(".card_table").html("");
	}
	
	// New table status
	function table_status( data ){
		$(".game-status").text(data["game_status"]);
		$(".game-spectators").text(data["spectators"]);
		$(".game-players-num").text(data["players"]);
		$(".game-max-players-num").text(data["max_players"]);
		$(".game-dealer").text(data["dealer"]);
		$(".game-on_turn").text(data["player_turn"]);
		//$(".game-direction").text(data["direction"]);
		if(data["direction"] === "Clockwise"){
			$(".game-direction-wrap span").removeClass();
			$(".game-direction-wrap span").addClass('right');
		}
		if(data["direction"] === "Counterclockwise"){
			$(".game-direction-wrap span").removeClass();
			$(".game-direction-wrap span").addClass('left');
		}
		if(data["direction"] === "Unknown"){
			$(".game-direction-wrap span").removeClass();
			$(".game-direction-wrap span").addClass('none');
		}
	}
	socket.on('table_status', table_status);
			
	// Add players to the top of the screen
	function process_player_list( data ){
		$('.players ul').html('');
		for(var i = 0; i < data.length; i++ ){
			$('.players ul').append('\
			<li id="player-'+i+'" class="player">\
				<img class="player-avatar" src="https://api.adorable.io/avatars/155/'+data[i]["nick"]+'.png">\
					<div class="player-wrap">\
						<div>'+data[i]["nick"]+'</div>\
						<div class="card_number">Cards: '+data[i]["cards"]+'</div>\
					</div>\
			</li>\
			');
		}
		
		$('.choose_player_box ul').html('');
		for(var i = 0; i < data.length; i++ ){
			$('.choose_player_box ul').append('\
			<li id="choose-player-'+i+'" data-value="'+i+'" class="player">\
				<img class="player-avatar" src="https://api.adorable.io/avatars/155/'+data[i]["nick"]+'.png">\
					<div class="player-wrap">\
						<div>'+data[i]["nick"]+'</div>\
						<div class="card_number">Cards: '+data[i]["cards"]+'</div>\
					</div>\
			</li>\
			');
		}
	}
	socket.on('player_list', process_player_list);
	
	// Change in card number
	function process_player_card_number( data ){
		$('#player-'+data["index"]+' .card_number').text('Cards: '+data["num"]);
		$('#choose-player-'+data["index"]+' .card_number').text('Cards: '+data["num"]);
	}
	socket.on('player_card_number', process_player_card_number);
	
	// Change in player turn
	function process_player_turn( data ){
		$('.players ul li').removeClass('player-turn');
		$('#player-'+data+'').addClass('player-turn');
		$('.cards').addClass('not-your-turn');
		$('.your_turn_banner').hide();
	}
	socket.on('player_turn', process_player_turn);
	
	// Select me in the list of players
	function process_player_you( data ){
		$('.players ul li').removeClass('player-you');
		$('#player-'+data+'').addClass('player-you');
		$('#choose-player-'+data+'').remove();
	}
	socket.on('player_you', process_player_you);
			
	// Help handler
	$('.game_help').on("click", function(){
		$('.game_help_data').toggle();
	});
	$('.game_help_data').on("click", function(){
		$('.game_help_data').hide();
	});

	// Mute handler
	var game_is_muted = false;
	$('.game_mute').on("click", function(){
		game_is_muted = !game_is_muted;
		if(game_is_muted){
			$(".game_mute span").removeClass();
			$(".game_mute span").addClass('mute');
		}else{
			$(".game_mute span").removeClass();
			$(".game_mute span").addClass('sound');
		}
	});
			
	// Listen to sit event
	$('#btn_sit').on("click", function(){
		socket.emit('sit');
	});
	function process_sit_success(){
		$(".command_holder").hide();
	}
	socket.on('sit_success', process_sit_success);
	
	// Listen to leave event
	$("#btn_leave").on("click", function() {
		socket.emit('leave');
	});	
	function process_leave_success(){
		leave_table();
	}
	socket.on('leave_success', process_leave_success);
	
	// Listen to draw
	$('.card_table_deck').on("click", function(){
		socket.emit('draw');
	});
	
	// Listen for play
	$("#hand").delegate("li", "click", function() {
		var card_to_play_index = $(this).index().toString();
		var data = $(this).attr('data-value').toString();
		
		function ParseSingleCard(card){
			var Card_OBJ = card.split("");
			if(Card_OBJ[0] === "W" || Card_OBJ[0] === "F"){
				Card_OBJ[1] = Card_OBJ[0];
				Card_OBJ[0] = "X";
			}
	
			var color;
			if(Card_OBJ[0] === "R"){ color = "red"; }
			if(Card_OBJ[0] === "B"){ color = "blue"; }
			if(Card_OBJ[0] === "G"){ color = "green"; }
			if(Card_OBJ[0] === "Y"){ color = "yellow"; }
			if(Card_OBJ[0] === "X"){ color = "special"; }
			
			var symbol = Card_OBJ[1];
			
			return {"card_string": card, "card_array": Card_OBJ, "color": color, "symbol": symbol };
		}
		var card = ParseSingleCard(data);
		
		if(card["symbol"] === "W" || card["symbol"] === "F"){
			$(".choose_color").show();
			$(".choose_color").attr('data-value', card_to_play_index)
		}else if (card["symbol"] === "0"){
			$(".choose_player").show();
			$(".choose_player").attr('data-value', card_to_play_index)
		}else{
			socket.emit('play', card_to_play_index);
		}
	});
	
	// Add event to listen choose player event
	$(".choose_player ul").delegate("li", "click", function() {
		var card_to_play_index = $(".choose_player").attr('data-value').toString();
		var player_index = $(this).attr('data-value').toString();
		socket.emit('play', card_to_play_index, player_index);
		$(".choose_player").hide();
	});
	
	$(".choose_color .red").on("click", function(){
		var card_to_play_index = $(".choose_color").attr('data-value').toString();
		socket.emit('play', card_to_play_index, 'red');
		$(".choose_color").hide();
	});
	$(".choose_color .blue").on("click", function(){
		var card_to_play_index = $(".choose_color").attr('data-value').toString();
		socket.emit('play', card_to_play_index, 'blue');
		$(".choose_color").hide();
	});
	$(".choose_color .yellow").on("click", function(){
		var card_to_play_index = $(".choose_color").attr('data-value').toString();
		socket.emit('play', card_to_play_index, 'yellow');
		$(".choose_color").hide();
	});
	$(".choose_color .green").on("click", function(){
		var card_to_play_index = $(".choose_color").attr('data-value').toString();
		socket.emit('play', card_to_play_index, 'green');
		$(".choose_color").hide();
	});
	$(".choose_color .black").on("click", function(){
		var card_to_play_index = $(".choose_color").attr('data-value').toString();
		socket.emit('play', card_to_play_index, 'black');
		$(".choose_color").hide();
	});
	
	$(".choose_color").on("click", function(){
		$(".choose_color").hide();
	});
	
	$(".choose_player").on("click", function(){
		$(".choose_player").hide();
	});
			
	// New card on table
	function new_card_on_table(str, position_data){
		set_card_to_table(str, position_data);
		if(game_is_muted === false){
			function getRandomInt(min, max) {
				return Math.floor(Math.random() * (max - min + 1)) + min;
			} 
			var rand_deg = getRandomInt(1, 2);
			if(rand_deg === 1){ $("#audiotag_play_01").trigger("play"); }
			if(rand_deg === 2){ $("#audiotag_play_02").trigger("play"); }
		}
	}
	socket.on('new_card_on_table', new_card_on_table);
	
	// Someone have just draw a card event
	function new_draw(){
		if( $('.card_table_deck span').length > 0 ){
			$('.card_table_deck span:last-child').remove();
			if(game_is_muted === false){
				$("#audiotag_draw").trigger("play");
			}
		}
	}
	socket.on('new_draw', new_draw);
			
	function process_deck_on_table(num){
		$(".card_table span").not('span:last').remove();
		$('.card_table_deck').html("");
		if(num > 0){
			$('.card_table_deck').powerTip({ placement: 'ne' });
		}else{
			$.powerTip.destroy($('.card_table_deck'));
		}
		if(num > 108){ num = 108; }
		for(var i = 1; i <= num; i++){
			set_deck_to_table();
		}
	}
	socket.on('put_deck_on_table', process_deck_on_table);
			
	// Cards in hand changed
	function process_hand(data){
		
		function ParseSingleCard(card){
			var Card_OBJ = card.split("");
			if(Card_OBJ[0] === "W" || Card_OBJ[0] === "F"){
			Card_OBJ[1] = Card_OBJ[0];
			Card_OBJ[0] = "X";
			}

			var color;
			if(Card_OBJ[0] === "R"){ color = "red"; }
			if(Card_OBJ[0] === "B"){ color = "blue"; }
			if(Card_OBJ[0] === "G"){ color = "green"; }
			if(Card_OBJ[0] === "Y"){ color = "yellow"; }
			if(Card_OBJ[0] === "X"){ color = "special"; }
			
			var symbol = Card_OBJ[1];
			
			return {"card_string": card, "card_array": Card_OBJ, "color": color, "symbol": symbol };
		}

		$('#hand').html('');
		var card;
		for(var i = 0; i < data.length; i++){
			card = ParseSingleCard(data[i]);
			$('#hand').append('<li class="ena-card in-hand card-'+card["color"]+'-'+card["symbol"]+'" data-value="'+card["card_string"]+'"></li>');
		}
		
		// Calculate margin left for number of cards
		function CalcCardHoldingOffset(n){
			var x = n - 1;
			var px_wrap = 850;
			var px_card = 170;
			var px_margin = 30;
			
			if(n >= 7){
				var free = (px_wrap - px_card - px_margin);
				// ProTip: Floor on negative numbers 
				return Math.floor( (free - px_card * x ) / x );
			}else{
				return -70;
			}
		}
		var margin_offset = CalcCardHoldingOffset( data.length );
		$('.card_holder ul li').css('margin-left', margin_offset);
		
	}
	socket.on('player_hand', process_hand);
			
	// Sync time for next event
	function sync_time(data){
		MyRadialProgress.Update(data["percentage"], data["text"], data["color"]);
	}
	socket.on('sync_time', sync_time);
			
	function handle_game_end(){
		$(".command_holder").show();
		setTimeout(function(){
			$('.card_table').html('');
		}, 2500);
	}
	socket.on('game_end', handle_game_end);
			
	function winner_banner(data){
		if(game_is_muted === false){
			$("#audiotag_win").trigger("play");
		}
		$('.lost_banner').hide();
		$('.jump_banner').hide();
		$('.your_turn_banner').hide();
		$('.winner_banner').fadeIn("fast");
		setTimeout(function(){
			$('.winner_banner').fadeOut("fast");
		}, 2500);
	}
	socket.on('win', winner_banner);
	
	function lost_banner(){
		if(game_is_muted === false){
			$("#audiotag_lose").trigger("play");
		}
		$('.winner_banner').hide();
		$('.jump_banner').hide();
		$('.your_turn_banner').hide();
		$('.lost_banner').fadeIn("fast");
		setTimeout(function(){
			$('.lost_banner').fadeOut("fast");
		}, 2500);
	}
	socket.on('lost', lost_banner);
	
	function your_turn_banner(){
		$('.cards').removeClass('not-your-turn');
		$('.your_turn_banner').fadeIn("fast");
		setTimeout(function(){
			$('.your_turn_banner').fadeOut("fast");
		}, 2500);

		if(looking_at_page === false){
			$("title").text("YOUR TURN!!!");
			if(game_is_muted === false){
				$("#audiotag_yourturn").trigger("play");
			}
		}
	}
	socket.on('your_turn', your_turn_banner);
	
	function jump_banner(){
		$('.jump_banner').fadeIn("fast");
		setTimeout(function(){
			$('.jump_banner').fadeOut("fast");
		}, 2500);
	}
	socket.on('jump', jump_banner);

	// Listen for global doucment keypress
	$(document).keydown(function(e) {
		if( $(".command_holder").is(":visible") ){
			if ( e.which === 13 ) { // Enter
				$('#btn_sit').click();
				e.preventDefault();
			}
		}
	});

	if(RadialProgress){
		MyRadialProgress = RadialProgress('#radial-progress');
	}
	
	
	$('.card_table_deck').data('powertip', 'First click will draw a card.<br/>Second click will pass the round to the next player.');
	

	// Get page title
  var pageTitle = $("title").text();
  var looking_at_page = true;
	// Change page title on blur
	$(window).blur(function() {
		looking_at_page = false;
	});
	// Change page title back on focus
	$(window).focus(function() {
		looking_at_page = true;
		$("title").text(pageTitle);
	});

// Adding Easter Egg terminal command
Terminal.AddCommand({"name": "easter egg", "function": function(err, cmd){ 

  if(typeof cmd !== "string"){return;}
  var parse_cmd = cmd.match(/^\/(.+)/i);
  if(parse_cmd){
    var cmd_full = parse_cmd[1];
    if(cmd_full.match(/^easter egg$/i)){

      function createElement( str ) {
          var frag = document.createDocumentFragment();
          var elem = document.createElement('span');
          elem.innerHTML = str;
          while (elem.childNodes[0]) {
              frag.appendChild(elem.childNodes[0]);
          }
          return frag;
      }
      document.body.appendChild( createElement("<iframe style=\"z-index: 99999; position: absolute;top: 20px;left: 50%;margin-left: -270px;\" width=\"560\" height=\"315\" src=\"//www.youtube.com/embed/zkniHL_xreo?autoplay=1\" frameborder=\"0\" allowfullscreen></iframe>") );

    }
  }

 } });


});