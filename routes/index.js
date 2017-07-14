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
 * 
 * Sending requests from terminal:
 * https://stackoverflow.com/questions/7172784/how-to-post-json-data-with-curl-from-terminal-commandline-to-test-spring-rest
 * 
 * ================================================ */

const express = require('express');
const router = express.Router();

const User = require('../schemas/user.js');
const TravelNotice = require('../schemas/travel_notice.js');
const Message = require('../schemas/message.js');

function log_requested_items(request){
	console.log("BODY\n\n", request.body, "\n\nPARAMS\n\n", request.params, "\n\nQUERY\n\n", request.query);
}

/* GET test */
router.get('/test', function(request, response, next) {
	response.setHeader('Content-Type', 'application/json');
	response.send(JSON.stringify({numbers: [0,1,2,3,4,5,6], names: ["Ruben", "Amanda", "Robert"]}));
});

/* POST new user into database */
router.post('/new_user', function(request, response, next) {
	/*
	testCall from terminal: 
	{f_name:"test",l_name:"test",email:"test@test.test",dob:"ddmmyy",description:"test description",phone:"1111111111"}
	curl -X POST http://localhost:3000/new_user?f_name=dumb&l_name=dumb&email=dumb@dumb.dumb&dob=ddmmyy&description=dumb%20description&phone=1111111111
	*/

	// for debugging
	log_requested_items(request);

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

	console.log(infos+"\n\n\n");
	// check if user exists in database just by email first, 
	// if yes, send an error that user exists, if no, save that user

	/* * * * TO DO * * * */

	// save the user if he doesn't exist, will be part of the block before this
	user.save(function(registration_error) {
		let callback = function(message, status){
			response.setHeader('Content-Type', 'application/json');
			response.status(status);
			let server_response = status >= 400 ? {message:message, error: true} : {message:message, error: false};
			response.send(JSON.stringify(server_response));
		}

		if (!registration_error) {
			console.log("REGISTRATION COMPLETE");
			callback("success", 200);
		} else {
			console.log(`REGISTRATION ERROR`, registration_error);
			callback(registration_error, 500);
		}
	});
});

/* GET user id */
router.get('/userid', function(request, response, next) {
	// returns the id of the user that is requesting it with its email
	
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

/* GET login */
router.get('/login', function(request, response, next) {
	// returns the email and id of the user that is logging in
	
	response.setHeader('Content-Type', 'application/json');
	//Returns a list of travelers from the search query
	response.send(JSON.stringify({message: "not implemented endpoint"}));
});

/* GET travel notices */
router.get('/travels', function(request, response, next) {
	// callback once we get the result
	let callback = function(status, travelers, error){
		// callback for responding to send to user
		response.setHeader('Content-Type', 'application/json');
		response.status(status);
		if (error) {
			let server_response = {success:false, travelers:null, error:error};
		} else if (travelers == null) {
			let server_response = {success:false, travelers:null, error:false};
		} else {
			let server_response = {success:true, travelers:travelers, error:false};
		}
		response.send(JSON.stringify(server_response));
	}
	TravelNotice.find({}, function(error, search){
		if (error){
			// handle error
			callback(500, null, error);
		} else if (search) {
			// Filter the list for elements that matched the search
			/* * * * * * HERE * * * * */
		} else {
			// return null if there was no search found
			callback(200, null, null);
		}
	});
	response.setHeader('Content-Type', 'application/json');
	//Returns a list of travelers from the search query
	response.send(JSON.stringify({message: "not implemented endpoint"}));
});

/* POST send or receive request */
router.post("/request", function(request, response, next) {
	// send or receive request sent to a specific user from query or body

	res.setHeader('Content-Type', 'application/json');
	response.send(JSON.stringify({message: "not implemented endpoint"}));
});

/* POST add a travel notice to the database */
router.post("/travel_notice_add", function(request, response, next) {
	/*
	THIS ASSUMES THAT VARIABLES GIVEN IN THE REQUEST ARE CORRECT

	testCall from terminal: 
	curl -X POST http://localhost:3000/travel_notice?item_types=envelope,clothing,smbox
	*/

	// for debugging
	log_requested_items(request);

	// get the variables from the request
	var travelNotice = new TravelNotice({
		tuid: request.body.tuid,
		airline: request.body.airline,
		flight_num: request.body.flight_num,
		item_types: request.body.item_types, // [envelope, smbox, lgbox, clothing, and other]
		drop_off_flexibility: request.body.drop_off_flexibility,
		pick_up_flexibility: request.body.pick_up_flexibility,
		//Departure, dep
		dep_iata: request.body.dep_iata,
		dep_city: request.body.dep_city,
		dep_min: request.body.dep_min,
		dep_hour: request.body.dep_hour,
		dep_day: request.body.dep_day,
		dep_month: request.body.dep_month,
		dep_year: request.body.dep_year,
		//Arrival: arr
		arr_iata: request.body.arr_iata,
		arr_city: request.body.arr_city,
		arr_min: request.body.arr_min,
		arr_hour: request.body.arr_hour,
		arr_day: request.body.arr_day,
		arr_month: request.body.arr_month,
		arr_year: request.body.arr_year
	});

	// place this in the database
	travelNotice.save(function(saving_error){
		let callback = function(message, status){
			response.setHeader('Content-Type', 'application/json');
			response.status(status);
			let server_response = status >= 400 ? {message:message, error: true} : {message:message, error: false};
			response.send(JSON.stringify(server_response));
		}

		// this will throw an error if one of the required variables is not given.
		if (!saving_error) {
			console.log("Saving successful");
			callback("success", 200);
		} else {
			console.log(`Saving error occured`, saving_error);
			callback(saving_error, 500);
		}
	});
});

router.post("/travel_notice_update", function(request, response, next) {

	// callback once we get the result
	let callback = function(status, data, error){
		response.setHeader('Content-Type', 'application/json');
		response.status(status);
		let server_response;
		if (error) {
			server_response = {success:false, data:null, error:error};
		} else if (data == null) {
			server_response = {success:false, data:null, error:false};
		} else {
			server_response = {success:true, data:data, error:false};
		}
		response.send(JSON.stringify(server_response));
	}

	// set the updated travel notice
	var updatedTravelNotice = new TravelNotice({
		tuid: request.query.tuid,
		airline: request.query.airline,
		flight_num: request.query.flight_num,
		item_types: request.query.item_types, // [envelope, smbox, lgbox, clothing, and other]
		drop_off_flexibility: request.query.drop_off_flexibility,
		pick_up_flexibility: request.query.pick_up_flexibility,
		//Departure, dep
		dep_iata: request.query.dep_iata,
		dep_city: request.query.dep_city,
		dep_day: request.query.dep_day,
		dep_month: request.query.dep_month,
		dep_year: request.query.dep_year,
		dep_time: request.query.dep_time,
		//Arrival: arr
		arr_iata: request.query.arr_iata,
		arr_city: request.query.arr_city,
		arr_day: request.query.arr_day,
		arr_month: request.query.arr_month,
		arr_year: request.query.arr_year,
		arr_time: request.query.arr_time
	});

	// find the specific travel notice to be updated
	TravelNotice.findOneAndUpdate({_id: request.query.travel_notice_uid, tuid: request.query.tuid}, updatedTravelNotice, function(error, data) {
		if (error){ callback(500, null, error); } 
		else {
			// if we get the data, we send it to the user
			callback(200, data, false);
		}
	});
});
router.post("/travel_notice_delete", function(request, response, next) {
	// callback once we get the result
	let callback = function(status, data, error){
		response.setHeader('Content-Type', 'application/json');
		response.status(status);
		let server_response;
		if (error) { server_response = {success:false, data:null, error:error}; } 
		else { server_response = {success:true, data:data, error:false}; }
		response.send(JSON.stringify(server_response));
	}

	// remove the travel notice
	TravelNotice.remove({_id: request.query.travel_notice_uid, tuid: request.query.tuid}, updatedTravelNotice, function(error, data) {
		if (error){
			callback(500, null, error);
		} else {
			// if we get the data, we send it to the user
			callback(200, data, false);
		}
	});
});

router.get("/getUsers", function(request, response, next){
	// curl -X GET http://localhost:3000/getUsers
	User.findOne({_id: request.query.id}, function(err, data){
		if (err){
			response.send("NOT FOUND");
		} else {
			response.send(data);
		}
	});
});
module.exports = router;

/* ===================================================
 * 
 * AIPORT API:
 * Base URL:
 * Endpoint: 
 * 
 * ================================================ */

/* ===================================================
 * 
 * Heroku pushes:
 * 
 * git add <files>
 * git commit -m "messages"
 * git push origin master
 * 
 * git push heroku master # seems like it pushes from github
 * 
 * To run locally:
 * heroku local
 * # if we do web, it does what's in web
 * 
 * ================================================ */