var express = require('express');
var router = express.Router();

// We just won't use users!

/* POST send message */
router.get("/message", function(request, response, next) {
	// message a user via chats

	res.setHeader('Content-Type', 'application/json');
	response.send(JSON.stringify({message: null}), null, 3);
});

/* POST send or receive request */
router.get("/request", function(request, response, next) {
	// send or receive request sent to a specific user from query or body

	res.setHeader('Content-Type', 'application/json');
	response.send(JSON.stringify({message: null}), null, 3);
});

module.exports = router;
