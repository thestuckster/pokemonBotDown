const EventEmitter = require('events');
const assert = require('assert');


class Trainer extends EventEmitter {
    constructor(name, isNamed, avatarId, pokemonClient){
        super();
        this.name = name;
        this.isNamed = isNamed;
        this.avatarId = avatarId;
        this.pclient = pokemonClient;
    }

    isGuest() {
        return this.isNamed === 0;
    }

    updateData(name, isNamed, avatarId) {
        this.name = name;
        this.isNamed = isNamed;
        this.avatarId = avatarId;
    }

    setAvatarId(avatarId) {
    	this.avatarId = avatarId;
    	this.pclient.sendCommand("avatar", [avatarId]);
    }
}

module.exports = Trainer;
