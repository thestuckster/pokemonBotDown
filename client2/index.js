let pclient = require('./pokemonClient');

var cl = new pclient.PokemonClient({
    username: 'ironeternity',
    password: 'cubecubecube'
});

cl.on('newchallenge', data => {
    console.log("Accepting challenge from ", data.challenger);
    cl.acceptChallenge(data.challenger);
});

cl.on('newBattle', battle => {
    console.log("New battle ", battle.battleId);

});
