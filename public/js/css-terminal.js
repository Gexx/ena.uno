/*
	CSS Terminal Plugin
	Version 1.0
*/
var Terminal = {};

Terminal.isOpen = false;
Terminal.isOpenInProgress = false;
Terminal.isInputInFocus = false;

Terminal.History = [];
Terminal.HistoryIndex = 0;
Terminal.HistoryTemp = "";

Terminal.scroll_on = 1;
Terminal.debug_scrolling = 0;
Terminal.scroll_freeze_time = 3e3;

Terminal.Commands = [];

// ### Injection to HTML ###
$(document).ready(function(e) {

	function addCss(cssCode) {
		var styleElement = document.createElement("style");
		styleElement.type = "text/css";
		
		if (styleElement.styleSheet) {
			styleElement.styleSheet.cssText = cssCode;
		} else {
			styleElement.appendChild(document.createTextNode(cssCode));
		}
		document.getElementsByTagName("head")[0].appendChild(styleElement);
	}

	var css = '.terminal-command,.terminal-css{position:absolute;padding:0;width:100%}.terminal-css{display:none;color:#0C0;height:35%;top:0;left:0;opacity:1;margin:0;z-index:9999999}.terminal-content{font-weight:700;height:90%;overflow-y:auto;overflow-x:hidden;background:#000;opacity:.9}.terminal-content-data{display:block}.terminal-content-line{white-space:pre-wrap;white-space:-moz-pre-wrap;white-space:-pre-wrap;white-space:-o-pre-wrap;word-wrap:break-word}.terminal-command{bottom:0;height:10%}.terminal-command-input{display:block;width:100%;font-size:18px;padding:3px 10px;border:2px solid #000;box-sizing:border-box;color:#181818;text-align:left}';
	addCss(css);
	
	var html = '\
	<div class="terminal-css">\
		<div class="terminal-content">\
			<div class="terminal-content-data">\
			</div>\
		</div>\
		<div class="terminal-command">\
			<input type="text" class="terminal-command-input" placeholder="Type your command here..." />\
		</div>\
	</div>\
	';
	$("body").prepend(html);
});
// ### Injection to HTML end ###

// Functions
Terminal.Toggle = function(){
	if(Terminal.isOpenInProgress === true){ return; } // Fix for `Tilde` key
	Terminal.isOpenInProgress = true;
	
	Terminal.isOpen = !Terminal.isOpen;
	if(Terminal.isOpen === true){
		$(".terminal-css").slideDown("slow", "swing", function(){
			Terminal.isOpenInProgress = false;
			$(".terminal-command-input").focus();
		});
	}else{
		$(".terminal-css").slideUp("slow", "swing", function(){
			Terminal.isOpenInProgress = false;
		});
	}
};
Terminal.WrieLine = function(str) {
	$(".terminal-content-data").append('<div class="terminal-content-line">'+str+'</div>');
	if(Terminal.scroll_on){
		scroll_to_bottom_of_terminal();
	}
};
Terminal.Clear = function() {
	$(".terminal-content-data").html("");
};
Terminal.ClearInput = function() {
	$(".terminal-command-input").val("");
};
Terminal.ClearHistory = function() {
	Terminal.History = [];
};

Terminal.RunCommand = function(cmd) {
	if(typeof cmd !== "string"){return;}
	var parse_cmd = cmd.match(/^\/(.+)/i);
	if(parse_cmd){
		var cmd_full = parse_cmd[1];
		
		if(cmd_full.match(/^clear$/i)){
			Terminal.Clear();
		}
		
		if(cmd_full.match(/^reload$/i)){
			location.reload();
		}
		
		if(cmd_full.match(/^refresh$/i)){
			location.reload();
		}
		
		if(cmd_full.match(/^help$/i)){
			Terminal.WrieLine("########################################################################################");
			Terminal.WrieLine(" Welcome to help...");
			Terminal.WrieLine("   /clear		- Clears the terminal.");
			Terminal.WrieLine("   /reload		- Reloads the browser.");
			Terminal.WrieLine("   /refresh		- (Same as reload) Reloads the browser.");
			Terminal.WrieLine("########################################################################################");
		}
	}

	for(var i = 0; i < Terminal.Commands.length; i++){
		Terminal.Commands[i]["function"](null, cmd);
	}
};
Terminal.AddCommand = function(data) {
	var name = data["name"] || "name";
	var _function = function(){ };
	if(typeof data["function"] === "function"){_function = data["function"];}
	Terminal.Commands.push({
		"name": name,
		"function": _function
	});
};
Terminal.ClearCommandList = function(data) {
	Terminal.Commands = [];
};

// ### Scrolling handlers ###
function scroll_to_bottom_of_terminal() {
	var terminalScroll = $(".terminal-content");
	terminalScroll.stop().animate({
		scrollTop: terminalScroll[0].scrollHeight
	}, 0);
}
	
$(document).ready(function(e){
	
	var chatscroll = $(".terminal-content");
	var chatlog = $(".terminal-content-data");
	var r = 0;
	
	chatscroll.scroll(function() {
		
		var t = chatscroll.height();
		var e = chatscroll.offset().top;
		var n = chatlog.outerHeight() - 2;
		
		if( Math.ceil(t - chatlog.offset().top + e) > n ){
			if(Terminal.debug_scrolling){
				console.log("Chat (Locked)");
			}
			clearTimeout(r);
			Terminal.scroll_on = !0;
		}else{
			Terminal.scroll_on = !1;
			if(Terminal.debug_scrolling){
				console.log("Chat (Unlocked)");
			}
			clearTimeout(r);
			r = setTimeout(function() {
				if(Terminal.debug_scrolling){
					console.log("Chat (x)");
				}
				Terminal.scroll_on = !0;
			}, Terminal.scroll_freeze_time * 1e3);
		}
	
	});

	scroll_to_bottom_of_terminal();
	
});
// ### Scrolling handlers end ###

// ### Input handlers ###		
$(document).ready(function(e) {
	$( ".terminal-command-input" ).keydown(function( e ) {
		// 37 left, 39 right
		if ( e.which === 38 ) { // UP
			if(Terminal.HistoryIndex === Terminal.History.length){
				Terminal.HistoryTemp = $(".terminal-command-input").val();
			}
			if(Terminal.HistoryIndex > 0){ Terminal.HistoryIndex--; }
			if(Terminal.HistoryIndex === -1){
				$(".terminal-command-input").val( "" );
			}else{
				$(".terminal-command-input").val( Terminal.History[Terminal.HistoryIndex] );
			}
			e.preventDefault();
		}
		if ( e.which === 40 ) { // DOWN
			if(Terminal.HistoryIndex < Terminal.History.length){ Terminal.HistoryIndex++; }
			if(Terminal.HistoryIndex === Terminal.History.length){
				$(".terminal-command-input").val( Terminal.HistoryTemp );
			}else{
				$(".terminal-command-input").val( Terminal.History[Terminal.HistoryIndex] );
			}
			e.preventDefault();
		}
		if ( e.which === 13 ) { // Enter
			Terminal.HistoryIndex = Terminal.History.length + 1;
			var command = $(".terminal-command-input").val();
			if( command !== "" && Terminal.History[Terminal.History.length - 1] !== command){
				Terminal.History.push( command );
			}
			Terminal.RunCommand( command );
			Terminal.ClearInput();
			e.preventDefault();
		}
	});
	
	$( document ).keypress(function( e ) {
		if ( e.which === 184 || e.which === 43 ) {
			Terminal.Toggle();
			e.preventDefault();
		}
	});
});
// ### Input handlers end ###