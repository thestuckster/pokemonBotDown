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

    battle.on('turn', () => {
        console.log("Turn!");

        cl.trainer.setAvatarId(Math.ceil(Math.random() * 293));

		const possibleMoves = battle.possibleMoves;
		const firstAvailableMove = Object.keys(possibleMoves).find(moveId => {
			const move = possibleMoves[moveId];
			return !move.disable && move.pp > 0;
		});

        battle.chooseMove(firstAvailableMove);
    });
});
