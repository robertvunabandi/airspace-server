// Schemas
const User = require('../schemas/user.js');
const TravelNotice = require('../schemas/travel_notice.js');
const RawrRequest = require('../schemas/request.js');
const MessageCreator = require('../schemas/message.js');

module.exports = function(io) {
	io.on('connection', function(socket) {
		console.log(` a user is connected! `);

		socket.on('disconnect', function() {
			console.log(` a user is now disconnected :( `);
		});
	});
};