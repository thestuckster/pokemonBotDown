var WebSocket = require('ws');
var util = require('util');
var readline = require('readline');
var http = require('http');


var comm = require('./comm.js');

var config = {
    username: 'USERNAME',
    password: 'PASSWORD',
};

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
// http://play.pokemonshowdown.com/action.php

var pclient = new comm.PokemonClient(config.username, config.password);
rl.on('line', function (line){
    //ws.send(line);
    sline = line.split(" ");
    var cmd = sline[0];
    if (cmd === "accept"){
        pclient.acceptChallenge(sline[1]);
    } else if (cmd === "join"){
        util.log("Joining " + sline[1]);
        pclient.joinRoom(sline[1]);
    } else if (cmd === "move"){
        //pclient.chooseMove(sline[1]);
        if (sline[2] === "next"){
            pclient.chooseMove(sline[1], true);
        } else {
            pclient.chooseMove(sline[1]);
        }
    } else if (cmd === "switch"){
        
        if (sline[2] === "next"){
            pclient.chooseSwitch(sline[1], true);
        } else {
            pclient.chooseSwitch(sline[1]);
        }
    } else if (cmd === "random"){
        pclient.doRandomMove();
    }
});

rl.on('close', function (line){
    util.log("Bye");
});

pclient.ws.on('open', function (){
    util.log("Connection opened.");
    //postLogin(config.username, config.password, '', '');
});

pclient.ws.on('close', function() {
    util.log('disconnected');
});

pclient.on('turn', function (){
    pclient.doRandomMove();
});

pclient.on('forceswitch', function(){
    util.log("Being force switched!");
    pclient.chooseSwitch(2, true);
});
