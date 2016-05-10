var util = require('util');
var restler = require('restler');
var WebSocket = require('ws');

var EventEmitter = require('events').EventEmitter;

function PokemonClient(username, password){
    this.ws = new WebSocket('ws://sim.smogon.com:8000/showdown/websocket');
 
    var self = this;
    this.battle = null;
    this.turnNumber = 0;
    this.turnData = null;
    this.ws.on('message', function(msg, flags){
        var lines = msg.split("\n");
        var room = 'lobby';
        if (lines[0][0] === '>'){
            room = lines[0].substring(1);
            util.log("Message from room: " + room);
        }
        var pieces;
        for (var i = 0; i < lines.length; i++){
            util.log("Msg from " + room + ": " + lines[i]);
            pieces = lines[i].split("|");
            if (pieces[1] === 'init' && pieces[2] === 'battle'){
                util.log("ENTERING BATTLE: " + room);
                self.battle = room;
                self.turnNumber = 0;
                
            } else if (pieces[1] == "turn"){
                self.turnNumber++; // The number that the server sends is NOT accurate...
                self.emit('turn');
                
            } else if (pieces[1] == "request"){
                var dat = JSON.parse(pieces[2]);
                util.log(util.inspect(dat, {depth: null, colors: true}));
                if (dat.active){
                    self.turnData = dat;
                }
                if (dat.forceSwitch){
                    self.emit('forceswitch');
                    //self.turnNumber++;
                }
            } else if (pieces[1] === 'challstr'){
                postLogin(self.ws ,username, password, pieces[2], pieces[3]);
            } else if (pieces[1] === 'faint'){
                util.log("Someone fainted. Increasing turn.");
                self.turnNumber++;
            }
        }
    });
}
util.inherits(PokemonClient, EventEmitter);

PokemonClient.prototype.acceptChallenge = function(username){
    util.log("Accepting challenge from " + username);
    //this.ws.send("[\"|/utm \"]");
    var str = "|/accept " + username
    util.log(str);
    this.ws.send(str);
};

PokemonClient.prototype.joinRoom = function(room){
    this.ws.send("|/join " + room);
};


PokemonClient.prototype.leaveRoom = function(room){
    this.ws.send("|/leave " + room)
};

PokemonClient.prototype.chooseMove = function(move, nextturn){
    if (nextturn){
        var turn = this.turnNumber + 1;
    } else {
        var turn = this.turnNumber;
    }
    var msg = this.battle + "|/choose move " + move + "|" + turn;
    util.log("SENDING: " + msg);
    this.ws.send(msg);
};

PokemonClient.prototype.chooseSwitch = function(pokeNum, nextturn){
    if (nextturn){
        var turn = this.turnNumber + 1;
    } else {
        var turn = this.turnNumber;
    }
    var msg = this.battle + "|/choose switch " + pokeNum + "|" + turn;
    util.log("SENDING: " + msg);
    this.ws.send(msg);
};

PokemonClient.prototype.doRandomMove = function(){
    var moves = this.turnData.active[0].moves;
    var move = moves[Math.floor(Math.random() * moves.length)].id;
    util.log("Choosing move at random: " + move);
    this.chooseMove(move);
};
PokemonClient.prototype.getMoves = function(){
    return this.turnData.active[0].moves
};

PokemonClient.prototype.getPokemon = function(){
    return this.turnData.side.pokemon;
};

PokemonClient.prototype.getLivingPokemon = function(){
    return this.turnData.side.pokemon.filter(function (pokemon){
        return pokemon.condition !== '0 fnt';
    });
};
    
function postLogin(ws, username, password, keyid, challenge){
    var ws = ws;
    restler.post("http://play.pokemonshowdown.com/action.php", {
        data: {
            act: 'login',
            name: username,
            pass: password,
            challengekeyid: keyid,
            challenge: challenge,
        }}).on('complete', function (data, response){
            util.log("Login returned: " + data);
            var jdat = JSON.parse(data.substring(1));
            ws.send("|/trn " + username + ",0," + jdat.assertion);
        });
}

exports.PokemonClient = PokemonClient;
