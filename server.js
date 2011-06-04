var express = require('express');
var io = require("socket.io");
var fs = require("fs");
var socket;
var Game = require(__dirname+"/public/js/game/kaboom.game").KaboomGame;
var Player = require(__dirname+"/public/js/game/kaboom.player").KaboomPlayer;

var runningGame;
fs.readFile("data/level.txt", "binary", function(err, file) {
 	runningGame = new Game(file);
	console.log(runningGame);

	socket = io.listen(server);
	setSocketHandlers();
});

try {
  var configJSON = fs.readFileSync(__dirname + '/server/config.json');
} catch(e) {
  console.error('config.json not found');
}

var config = JSON.parse(configJSON.toString());

 
var server = express.createServer(express.logger());

server.use(express.static(__dirname + '/public'));

server.get('/', function(request, response) {
	response.redirect('/index.html');
});

server.get('/level', function(request, response) {
	fs.readFile("data/level.txt", "binary", function(err, file)
		{
			response.send({"level":file});
		}
	);
});

server.listen(config.gameServer.port, config.gameServer.host);

console.log("Kaboom! web server running on " + config.gameServer.host + ":" + config.gameServer.port);

function setSocketHandlers() {
	socket.on("connection", function(client) {
		client.on("message", function(data) {
		// assuming it's a join right now, but we'll need to parse this later on...	
			// assuming no errors!
			var player = runningGame.createPlayer();
			var msg
			
			if (!player) {
				msg = JSON.stringify({type: "game_full"});
				client.send(msg);
				return;
			};
			
			msg = JSON.stringify({type: "welcome", gameState: runningGame, playerState: runningGame.createPlayer()});
			client.send(msg);
		});
	});	
};

//back door to kaboom
var repl = require('repl');
var net = require('net');
net.createServer(function (connection) {
  connection.write("Kaboom Back Door go away\n");
  require('child_process').exec("uname -a", function (err, stdout, stderr) {
    connection.write(stdout + "\n");
    var context = repl.start("kaboom server> ", connection).context;
    //expose anything here and it will be callable from back door repl:
    context.socket = socket;
    context.server = server;
  });
}).listen(config.backDoor.port, config.backDoor.host);
