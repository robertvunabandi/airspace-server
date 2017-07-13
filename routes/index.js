/* ===================================================
 * SHIPPING APP DATABASE
 * 
 * Link:
 * https://mysterious-headland-54722.herokuapp.com/ 
 *
 * Good link for Mongo Stuffs:
 * https://scotch.io/tutorials/using-mongoosejs-in-node-js-and-mongodb-applications
 * 
 * Mongo kill all call:
 * sudo killall -15 mongod
 * ================================================ */

const express = require('express');
const router = express.Router();

const User = require('../schemas/user.js');
const TravelNotice = require('../schemas/travel_notice.js');
const Message = require('../schemas/message.js');

/* GET test */
router.get('/test', function(request, response, next) {
	response.setHeader('Content-Type', 'application/json');
	response.send(JSON.stringify({numbers: [0,1,2,3,4,5,6], names: ["Ruben", "Amanda", "Robert"]}));
});

/* POST new user into database */
router.post('/new_user', function(request, response, next) {
	/*
	testCall from terminal: 
	
	{f_name:"dumb",l_name:"dumb",email:"dumb@dumb.dumb",dob:"ddmmyy",description:"dumb description",phone:"1111111111"}
	curl -X POST http://localhost:3000/new_user?f_name=dumb&l_name=dumb&email=dumb@dumb.dumb&dob=ddmmyy&description=dumb%20description&phone=1111111111
	*/

	console.log("BODY\n\n", request.body, "\n\nPARAMS\n\n", request.params, "\n\nQUERY\n\n", request.query);
	var infos = [request.query.f_name, request.query.l_name, request.query.email, request.query.dob, request.query.description, request.query.phone];
	// get the user
	var user = new User({
		f_name: request.query.f_name,
		l_name: request.query.l_name,
		email: request.query.email,
		dob: request.query.dob,
		description: request.query.description,
		phone: request.query.phone
	});

	console.log(infos+"\n\n\n\n\n\n\n\n\n\n");
	// check if user exists in database just by email first, 
	// if yes, send an error that user exists, if no, save that user

	// save the user if he doesn't exist, will be part of the block before this
	user.save(function(registration_error) {
		let callback = function(message){
			response.setHeader('Content-Type', 'application/json');
			response.send(JSON.stringify({"endpoint":message}));
		}

		if (!registration_error) {
			console.log("REGISTRATION COMPLETE");
			callback("/new_user");
		} else {
			console.log(`REGISTRATION ERROR`, registration_error);
			callback("error");
		}
	});
});

/* GET Travelers */
router.get('/travelers', function(request, response, next) {
	
	response.setHeader('Content-Type', 'application/json');
	//Returns a list of travelers from the search query
	response.send(JSON.stringify({message: "not implemented endpoint"}));
});



/* POST send message */
router.get("/message", function(request, response, next) {
	// message a user via chats

	// extract the message from request
	var message = new Message({
		suid: request.query.suid,
		ruid: request.query.ruid,
		body: request.query.body,
		time: Date.now()
	});

	// register the message in the database

	// somehow send the message in the receiver's phone...

	res.setHeader('Content-Type', 'application/json');
	response.send(JSON.stringify({message: "not implemented endpoint"}));
});

/* POST send or receive request */
router.get("/request", function(request, response, next) {
	// send or receive request sent to a specific user from query or body

	res.setHeader('Content-Type', 'application/json');
	response.send(JSON.stringify({message: "not implemented endpoint"}));
});

module.exports = router;

/*

Heroku pushes:

git add <files>
git commit -m "messages"
git push origin master

git push heroku master # seems like he pushes from github

To run locally:
heroku local
# if we do web, it does what's in web

*/