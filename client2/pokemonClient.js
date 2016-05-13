const WebSocket = require('ws');
const request = require('request');
const Promise = require('bluebird');
const EventEmitter = require('events');
const assert = require('assert');

const Battle = require('./battle');

class PokemonClient extends EventEmitter {
    constructor(config){
        super();

        this.username = config.username;
        this.password = config.password;

        this.ws = new WebSocket('ws://sim.smogon.com:8000/showdown/websocket');

        this.systemMessageHandlers = {
            'challstr': this.handleChallstr,
            'pm': this.handlePm,
            'updatechallenges': this.handleUpdateChallenges
        };

        this.openChallenges = {};

        this.battles = {};

        this.ws.on('message', (data, flags) => {
            if (data[0] === '>'){
                this.handleBattleMessage(data);
            } else {
                data.split('\n').forEach(line => {
                    this.handleSystemLine(line);
                });
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

                assert(pokemonName == name2, 'Pokemon names do not match!');

                const level = parseInt(levelStr.slice(1));
            },

            'player': (args) => {
                if (args[0] === 'p1'){
                    assert.equal(args[1], this.username, "Username does not match player 1!");
                } else {
                    assert.equal(args[1], 'p2');
                    battle.setOpponentName(args[1]);
                }
            },

            'turn': (args) => {
                const turnNumber = parseInt(args[0]); // According to the last client, this number is a lie.
                // TODO battle.handleTurn() ?
            },

            'request': (args) => {
                const data = JSON.parse(args[0]);

                console.log(data);

                assertEqual(data.active.length, 1);
                const moves = data.active[0];

                const side = data.side;
                assertEqual(side.name, this.username);
                assertEqual(side.id, 'p1');

                const pokemon = side.pokemon;
                // TODO actually do something

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

    acceptChallenge(username){
        this.sendCommand('accept', [username])
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
