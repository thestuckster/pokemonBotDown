const WebSocket = require('ws');
const request = require('request');
const Promise = require('bluebird');
const EventEmitter = require('events');
const assert = require('assert');

const Battle = require('./battle');
const Trainer = require('./trainer');

class PokemonClient extends EventEmitter {
    constructor(config){
        super();

        this.username = config.username;
        this.password = config.password;

        this.ws = new WebSocket('ws://sim.smogon.com:8000/showdown/websocket');

        this.systemMessageHandlers = {
            'challstr': this.handleChallstr,
            'pm': this.handlePm,
            'updatechallenges': this.handleUpdateChallenges,
            'updateuser': this.handleUpdateUser
        };

        this.openChallenges = {};

        this.battles = {};

        this.ws.on('message', (data, flags) => {
            if (data[0] === '>'){
                this.handleBattleMessage(data);
            } else if (data[0] === '|') {
                data.split('\n').forEach(line => {
                    this.handleSystemLine(line);
                });
            } else {
                console.log("Unhandled ", data);
            }
        });

    }

    handleSystemLine(line) {

        if(line.length == 0){
            return;
        }

        assert(line[0] != '>');

        const pieces = line.split('|')
        assert(pieces[0] === '');

        const first = pieces[1];
        const remainder = pieces.slice(2);

        if (this.systemMessageHandlers[first]){
            this.systemMessageHandlers[first].call(this, remainder);
        } else {
            console.log("Unhandled ", first, ': ', remainder);
        }
    }

    handleBattleMessage(msg){
        console.log("=== NEW BATTLE MESSAGE === ");
        const lines = msg.split('\n');
        const battleId = lines[0].slice(1);

        const battle = this.getBattle(battleId); // May be undefined.

        const battleHandlers = {
            'init': (args) => {
                assert(battle == null, 'Battle recieved init but already exists!');
                this.newBattle(battleId);
            },

            'switch': (args) => {
                const [slot, pokemonName] = args[0].split(':').map(s => s.trim());
                const [name2, levelStr, gender] = args[1].split(',').map(s => s.trim());
                const [health, maxHealth] = args[2].split('/').map(parseInt);

                //assert(pokemonName == name2, 'Pokemon names do not match!');


                const level = parseInt(levelStr.slice(1));
            },

            'player': (args) => {
                if (args[0] === 'p1'){
                    assert.equal(args[1], this.trainer.name, "Username does not match player 1!");
                } else {
                    assert.equal(args[0], 'p2');
                    battle.setOpponentName(args[1]);
                }
            },

            'turn': (args) => {
                const turnNumber = parseInt(args[0]); // According to the last client, this number is a lie.
                console.log("Turn number is ", turnNumber);
                battle.turn(turnNumber);
            },

            'request': (args) => {
                const data = JSON.parse(args[0]);

                console.log(data);

                const side = data.side;
                const pokemon = side.pokemon;
                const activePokemon = pokemon.filter((pokemon) => pokemon.active);

                assert.equal(activePokemon.length, 1);
                assert.equal(side.name, this.trainer.name);
                assert.equal(side.id, 'p1');

                if ("active" in data) {
                    assert.equal(data.active.length, 1);
                    const moves = data.active[0].moves;
                    battle.setMoveData(moves);
                }
            },

            'start': (args) => {
                battle.start();
            }

        }

        lines.slice(1).forEach(line => {
            const pieces = line.split('|');

            const first = pieces[1];
            const remainder = pieces.slice(2);

            if (battleHandlers[first]){
                battleHandlers[first].call(this, remainder);
            } else {
                console.log("Unhandled battle ", first, ": ", remainder);
            }
        });
    }

    handleChallstr(args){
        const [keyId, challenge] = args;
        request.post({
            url: "http://play.pokemonshowdown.com/action.php",
            formData: {
                act: 'login',
                name: this.username,
                pass: this.password,
                challengekeyid: keyId,
                challenge: challenge
            }
        },  (err, response, body) => {
            // The body is returned with a square bracket at the beginning.
            const bodyData = JSON.parse(body.substring(1));
            this.sendCommand('trn', [this.username, 0, bodyData.assertion])
        });
    }

    handlePm(args){
        const [msgFrom, to, msg] = args.map(s => s.trim());
        this.emit('pm', {
            from: msgFrom,
            msg: msg
        });
    }

    handleUpdateChallenges(args){
        const challengerData = JSON.parse(args[0]);

        const newChallengers = keyDifferences(challengerData.challengesFrom, this.openChallenges);
        newChallengers.forEach(challenger => this.emit('newchallenge', {
            challenger: challenger,
            challengeType: challengerData.challengesFrom[challenger]
        }));

        this.openChallenges = challengerData.challengesFrom;
    }

    handleUpdateUser(args){
        const name = args[0];
        const isNamed = parseInt(args[1]);
        const avatarId = parseInt(args[2]);
        if (this.trainer) {
            this.trainer.updateData(name, isNamed, avatarId);
        } else {
            this.trainer = new Trainer(name, isNamed, avatarId, this);
        }
    }

    newBattle(battleId) {
        const newBattle = new Battle(battleId, this);
        this.battles[battleId] = newBattle

        this.emit('newBattle', newBattle);

    }

    getBattle(battleId) {
        return this.battles[battleId];
    }

    sendCommand(command, args){
        this.ws.send('|/' + command + ' ' + args.join());
    }

    sendBattleCommand(battleId, command, args, turnNumber){
        const cmd = battleId + '|/' + command + ' ' + args.join() + '|' + turnNumber;
        console.log("Sending battle command ", cmd);
        this.ws.send(cmd);
    }

    acceptChallenge(username){
        this.sendCommand('accept', [username])
    }

    sendChallenge(username, type) {
        this.sendCommand('challenge', [username, type]);
    }
}

// Returns a set of the differences between the keys of two objects.
function keyDifferences(a, b) {
    const aKeys = new Set(Object.keys(a));
    const bKeys = new Set(Object.keys(b));
    const difference = new Set([...aKeys].filter(x => !bKeys.has(x)));
    return difference;
}
module.exports.PokemonClient = PokemonClient;
