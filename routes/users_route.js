const express = require('express'); const router = express.Router();
// Schemas
const User = require('../schemas/user.js');
const TravelNotice = require('../schemas/travel_notice.js');
const ShippingRequest = require('../schemas/request.js');
const Notification = require('../schemas/notification.js');
const MessageCreator = require('../schemas/message.js');
// to make http calls
const http = require('http'); const REQUEST_HTTP = require('request');
// helpers
const helpers = require('../helpers.js');
/* debugging functions */
const LOG = helpers.LOG; const log_separator = helpers.log_separator; const log_requested_items = helpers.log_requested_items;
const sf_req = helpers.sf_req; const sf_req_bool = helpers.sf_req_bool; const sf_req_int = helpers.sf_req_int;
const isEmpty = helpers.isEmpty; const isEmptyArray = helpers.isEmptyArray; const isANumber = helpers.isANumber;

/* POST new user into database
 * curl -X POST http://localhost:3000/user_add?f_name=temporary&l_name=user&email=temp@orary.user
 * curl -X POST http://localhost:3000/user_add?f_name=dumb&l_name=dumb&email=dumb@dumb.dumb
 *
 * */
router.post('/add', function (request, response, next) {
	// callback function to call at the end
	let callback = function (status_, message_, data_, error_) {
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_ !== false) {
			server_response = {success: false, message: message_, data: null, error: error_};
		} else if (data_ === null) {
			server_response = {success: false, message: message_, data: null, error: false};
		} else {
			server_response = {success: true, message: message_, data: data_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	let fName = sf_req(request, "f_name", "new_user"),
		lName = sf_req(request, "l_name", "new_user"),
		_email = sf_req(request, "email", "new_user");

	// make names uppercase first letter
	fName = fName.substring(0, 1).toUpperCase() + fName.substring(1);
	lName = lName.substring(0, 1).toUpperCase() + lName.substring(1);

	// get the user
	let newUser = new User({
		f_name: fName,
		l_name: lName,
		email: _email,
		location: "the best place on earth",
		favorite_travel_place: "wherever has the cheapest flights",
		suitcase_color_integer: helpers.random.integer(9), // 9 is the index of rainbow
		travel_notices_ids: [], // intialize both of these as empty arrays
		requests_ids: [], // intialize both of these as empty arrays
		trips_taken: helpers.random.integer(100),
		dollars_made: helpers.random.integer(1000),
		items_sent: helpers.random.integer(200),
		date_created: helpers.newDate()
		// missing here: dob, phone, travel_notices_ids, requests_ids
	});

	if (fName || lName || _email) {
		callback(403, "Some or all of the parameters were not entered. Please enter all informations.", null, true);
	} else {
		/* check if user exists in database just by email first,
		 if yes, send an error that user exists, if no, save that user */
		User.findOne({email: newUser.email}, function (err, user_, next) {
			if (err) {
				// if there is an error, then we can't move on
				callback(500, "Internal server error while finding the user", null, err);
			} else if (user_) {
				// if the user is found, that means he just needs to log in by inputting their email
				callback(403, "User is already registered", null, true);
			} else {
				// save the user if he doesn't exist, will be part of the block before this
				newUser.save(function (registration_error, user_saved) {
					if (!registration_error) {
						// registration done successfully
						callback(201, "success", user_saved, false);
					} else {
						console.log(`REGISTRATION ERROR`, registration_error);
						callback(500, "A registration error occurred. Some parameters may have been missing.", null, registration_error);
					}
				});
			}
		});
	}
});

/* GET returns the id of the user requested by email
 * curl -X GET http://localhost:3000/user/get?uid=597fa392fb5eaf0011445f91
 * */
router.get('/get', function (request, response, next) {
	// callback once we get the result
	let callback = function (status_, message_, user_, error_) {
		// callback for responding to send to user
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_ !== false) {
			server_response = {success: false, data: null, message: message_, error: error_};
		} else if (user_ === null) {
			server_response = {success: false, data: null, message: message_, error: false};
		} else {
			server_response = {success: true, data: user_, message: message_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	// get the email and id
	let email = sf_req(request, "email", "get_user");
	let id = sf_req(request, "uid", "get_user");
	// test if both are not given, if true send an error, otherwise fetch user from DB
	if (isEmpty(email) && isEmpty(id)) {
		callback(403, "Either email or Id must be specified. None were.", null, true);
	} else {
		// we favor the email to the id
		let parameter = (isEmpty(email)) ? {_id: id} : {email: email};
		User.findOne(parameter, function (err, user, next) {
			if (err) {
				callback(500, "Internal Server Error", null, true);
			} else if (user === null) {
				callback(404, "User not found", null, false);
			} else {
				callback(200, "User found", user, false);
			}
		});
	}
});

/* GET update user
 * curl -X GET http://localhost:3000/user_update?
 **/
router.get('/update', function (request, response, next) {
	// callback for responding when done
	let callback = function (status_, data_, message_, error_) {

		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_) {
			server_response = {success: false, data: null, message: message_, error: error_};
		} else if (data_ === null) {
			// if we get to here that means travel_notice_ is not empty
			server_response = {success: false, data: null, message: message_, error: false};
		} else {
			server_response = {success: true, data: data_, message: message_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	// since people sign up or in just with emails, emails are not allowed to change
	let _id = sf_req(request, "uid", "user_update");
	let _email = sf_req(request, "email", "user_update");

	// get changing parameters from the request
	let _f_name = sf_req(request, "f_name", "user_update");
	let _l_name = sf_req(request, "l_name", "user_update");
	let _dob = sf_req(request, "dob", "user_update");
	let _location = sf_req(request, "location", "user_update");
	let _favorite_travel_place = sf_req(request, "favorite_travel_place", "user_update");
	let _suitcase_color_integer = sf_req(request, "suitcase_color_integer", "user_update");
	let _phone = sf_req(request, "phone", "user_update");
	let _travel_notices_ids = sf_req(request, "travel_notices_ids", "user_update");
	let _requests_ids = sf_req(request, "requests_ids", "user_update");

	User.findOne({_id: _id, email: _email}, function (findingError, foundUser) {
		if (findingError) {
			callback(500, null, "Internal Server Error", findingError);
		} else {
			if (!isEmpty(_f_name)) foundUser.f_name = _f_name;
			if (!isEmpty(_l_name)) foundUser.l_name = _l_name;
			if (!isEmpty(_dob)) foundUser.dob = _dob;
			if (!isEmpty(_location)) foundUser.location = _location;
			if (!isEmpty(_favorite_travel_place)) foundUser.favorite_travel_place = _favorite_travel_place;
			if (!isEmpty(_suitcase_color_integer)) foundUser.suitcase_color_integer = _suitcase_color_integer;
			if (!isEmpty(_phone)) foundUser.phone = _phone;
			if (!isEmpty(_travel_notices_ids)) foundUser.travel_notices_ids = _travel_notices_ids;
			if (!isEmpty(_requests_ids)) foundUser.requests_ids = _requests_ids;

			foundUser.save(function (savingError, savedUser) {
				if (savingError) {
					callback(500, null, "Internal Server Error", savingError);
				} else if (isEmpty(savedUser)) {
					callback(500, null, "Internal Server Error Unknown. Saved user was empty.", true);
				} else {
					callback(202, savedUser, "User updated successfully", false);
				}
			});
		}
	});
});

// TODO - Implement function, but this is the least needed for now
router.get('/delete', function (request, response, next) {

	// callback for responding when done
	let callback = function (status_, data_, message_, error_) {
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_) {
			server_response = {success: false, data: null, message: message_, error: error_};
		} else if (data_ === null) {
			// if we get to here that means travel_notice_ is not empty
			server_response = {success: false, data: null, message: message_, error: false};
		} else {
			server_response = {success: true, data: data_, message: message_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	callback(501, null, "Not yet implemented", true);
});

/* GET login */
router.get('/login', function (request, response, next) {
	// curl -X GET http://localhost:3000/user/login?email=test@test.test
	// returns the email and id of the user that is logging in

	// callback once we get the result
	let callback = function (status_, data_, message_, error_) {
		// callback for responding to send to user
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_) {
			server_response = {success: false, data: null, message: message_, error: error_};
		} else if (data_ === null) {
			// if we get to here that means travel_notice_ is not empty
			server_response = {success: false, data: null, message: message_, error: false};
		} else {
			server_response = {success: true, data: data_, message: message_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	// get the email from parameters
	let email = sf_req(request, "email", "get_user");
	// fetch user by email
	User.findOne({email: email}, function (err, user, next) {
		if (err) {
			callback(500, null, "Internal Server Error", err);
		} else if (user === null) {
			callback(404, null, "User not found in database", false);
		} else {
			callback(200, user, "Successful Login", false);
		}
	});
});

module.exports = router;

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */