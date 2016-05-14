const EventEmitter = require('events');
const assert = require('assert');


class Battle extends EventEmitter {
    constructor(battleId, pokemonClient){
        super();
        this.battleId = battleId;
        this.pclient = pokemonClient;
        this.moves = null;
    }

    setOpponentName(name){
        this.opponentName = name;
    }

    // Sets the current move data.
    // The moveData is the 'moves' field from the protocol request object.
    setMoveData(moveData){
        this.possibleMoves = {};
        moveData.forEach(move => {
            if (!move.disabled){
                let moveEntry = {};
                moveEntry.name = move.move;
                moveEntry.pp = move.pp;
                moveEntry.maxpp = move.maxpp;
                moveEntry.target = move.target;

                this.possibleMoves[move.id] = moveEntry;
            }
        });
    }

    getPossibleMoveIds(){
        return Object.keys(this.possibleMoves);
    }

    start(){
        this.emit('start');
    }

    win(){
        this.emit('win');
    }
}

module.exports = Battle;
