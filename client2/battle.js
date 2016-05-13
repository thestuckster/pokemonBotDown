const EventEmitter = require('events');
const assert = require('assert');


class Battle extends EventEmitter {
    constructor(battleId, pokemonClient){
        super();
        this.battleId = battleId;
        this.pclient = pokemonClient;
    }

    setOpponentName(name){
        this.opponentName = name;
    }

    win(){
        this.emit('win');
    }
}

module.exports = Battle;
