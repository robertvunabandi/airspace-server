/* ===================================================
 * SHIPPING APP DATABASE
 * 
 * Link:
 * https://mysterious-headland-54722.herokuapp.com/travel_notice_all
 *
 * Good link for Mongo Stuffs:
 * https://scotch.io/tutorials/using-mongoosejs-in-node-js-and-mongodb-applications
 * 
 * Mongo kill all call:
 * sudo killall -15 mongod
 *
 * https://stackoverflow.com/questions/21305049/heroku-how-can-you-check-heroku-error-logs
 * Check heroku logs: heroku logs
 * Check heroku logs in real time: heroku logs -t
 * 
 * Sending requests from terminal:
 * https://stackoverflow.com/questions/7172784/how-to-post-json-data-with-curl-from-terminal-commandline-to-test-spring-rest
 * 
 * ================================================ */

// chalk for logging stuffs with colors
const chalk = require('chalk');

const express = require('express');
const router = express.Router();

// Schemas
const User = require('../schemas/user.js');
const TravelNotice = require('../schemas/travel_notice.js');
const ShippingRequest = require('../schemas/request.js');
const MessageCreator = require('../schemas/message.js');

// helpers
const helpers = require('../helpers.js');

// to make http calls
const http = require('http');
const REQUEST_HTTP = require('request');

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* three debugging functions */
const LOG = {
	d: function (message_logged) {
		// d for debug
		console.log(chalk.bold.rgb(0, 0, 0).bgWhite(` ${message_logged} `));
	},
	i: function (message_logged) {
		// i for information
		console.info(chalk.rgb(0, 100, 255).bold(` ${message_logged} `));
	},
	w: function (message_logged) {
		// w for warn
		console.warn(chalk.rgb(255, 255, 0).bold(` ${message_logged} `));
	},
	e: function (message_logged) {
		// e for error
		console.error(chalk.underline.rgb(255, 0, 0).bold(` ${message_logged} `));
	}
};

function log_separator(count) {
	// for debugging purposes
	let sep = "* * * * * * * * * * * * * * * * * * * * * * * * ";
	if (count <= 1) {
		console.log(sep);
	}
	else {
		let i = 0;
		while (i < count) {
			console.log(sep);
			i++;
		}
	}
}
function log_requested_items(request) {
	log_separator(1);
	let body = "";
	for (let i = 0; i < Object.keys(request.body).length; i++) {
		body += `${Object.keys(request.body)[i]}:${request.body[Object.keys(request.body)[i]]}, \n`;
	}
	let query = "";
	for (let i = 0; i < Object.keys(request.query).length; i++) {
		query += `${Object.keys(request.query)[i]}:${request.query[Object.keys(request.query)[i]]}, \n`;
	}
	console.log(`BODY\n${body}QUERY\n${query}URL\n${request.url}`);
	log_separator(1);
}

/* functions to get variables from requests safely */
function sf_req(request, stringName, tag = null) {
	// stands for "save from request". Body is favored
	let result = request.body[stringName] === undefined || request.body[stringName] === null ? request.query[stringName] : request.body[stringName];
	if (result === null || result === undefined) {
		let folder = tag === null ? "" : tag;
		// it seems like chalk is causing server to crash
		console.log(` ** * W/${folder}: Both query and result are null or undefined for ${stringName}`);
	}
	return result;
}
/* functions to get booleans from requests safely */
function sf_req_bool(request, stringName, tag = null) {
	let res = sf_req(request, stringName, tag);
	if (typeof(res) === "string") return res === "true";
	else if (typeof(res) === "boolean") return res;
	else {
		let folder = tag === null ? "" : tag;
		console.log(` ** * W/${folder}: type of "${stringName}" is neither boolean nor string. Default set to false. This may cause errors.`);
		return false;
	}
}
/* functions to get integers from requests safely */
function sf_req_int(request, stringName, tag = null) {
	let folder = tag === null ? "" : tag;
	let res = sf_req(request, stringName, tag);
	if (isNaN(res)) {
		console.log(` ** * W/${folder}[${stringName}]: received NaN. Will return 0. This may cause errors.`);
		return 0;
	} else {
		return parseInt(res);
	}
}
/* function to check nullity, checks if something is null or empty */
function isEmpty(element) {
	// returns a boolean of whether this element is empty
	return element === null || element === undefined;
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* GET test
 * curl -X GET http://localhost:3000/test
 * */
router.get('/test', function (request, response, next) {
	response.setHeader('Content-Type', 'application/json');
	response.send(JSON.stringify({numbers: [0, 1, 2, 3, 4, 5, 6], names: ["Ruben", "Amanda", "Robert"]}));
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */


/* POST new user into database
 * curl -X POST http://localhost:3000/user_add?f_name=temporary&l_name=user&email=temp@orary.user
 * curl -X POST http://localhost:3000/user_add?f_name=dumb&l_name=dumb&email=dumb@dumb.dumb
 *
 * */
router.post('/user_add', function (request, response, next) {
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

	// get the user
	let newUser = new User({
		f_name: sf_req(request, "f_name", "new_user"),
		l_name: sf_req(request, "l_name", "new_user"),
		email: sf_req(request, "email", "new_user"),
		location: "the best place on earth",
		favorite_travel_place: "wherever has the cheapest flights",
		suitcase_color_integer: 9, // 9 is the index of rainbow
		travel_notices_ids: [], // intialize both of these as empty arrays
		requests_ids: [] // intialize both of these as empty arrays
		// missing here: dob, phone, travel_notices_ids, requests_ids
	});

	if (isEmpty(sf_req(request, "f_name", "new_user")) || isEmpty(sf_req(request, "l_name", "new_user")) || isEmpty(sf_req(request, "email", "new_user"))) {
		callback(403, "Some or all of the parameters were not given", null, true);
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
						callback(500, "Internal Server Error", null, registration_error);
					}
				});
			}
		});
	}

});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* GET returns the id of the user requested by email
 * curl -X GET http://localhost:3000/user_get?email=test@test.test
 * curl -X GET http://localhost:3000/user_get?uid=5977a6ca44f8d217b87f7819
 * */
router.get('/user_get', function (request, response, next) {
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

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* GET update user
 * curl -X GET http://localhost:3000/user_update?
 **/
router.get('/user_update', function (request, response, next) {
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

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
// TODO - Implement function, but this is the least needed for now
router.get('/user_delete', function (request, response, next) {

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

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* POST send message
 * curl -X POST http://localhost:3000/message_send
 **/
router.post("/message_send", function (request, response, next) {
	// message a user via chats

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

	// extract the message from request
	let suid_ = sf_req(request, "suid", "message_send");
	let ruid_ = sf_req(request, "ruid", "message_send");
	let body_ = sf_req(request, "body", "message_send");
	let time_ = helpers.newDate();

	// create the parameters to send back just in case
	let parameters = {suid: isEmpty(suid_) ? null : suid_, ruid: isEmpty(ruid_) ? null : ruid_};

	// create models for both
	let MessageSender = MessageCreator(suid_, ruid_);
	let MessageReceiver = MessageCreator(ruid_, suid_);

	// both the receiver and sender gets a message saved in their own collection for this chat
	let messageSavedToSender = new MessageSender({
		suid: suid_, ruid: ruid_, body: body_, time: time_, read: false
	});
	let messageSavedToReceiver = new MessageReceiver({
		suid: suid_, ruid: ruid_, body: body_, time: time_, read: false
	});

	if (isEmpty(suid_) || isEmpty(ruid_)) {
		callback(403, null, {
			message: "Some or all of the required parameters were empty",
			given_parameters: parameters
		}, true);
	} else {
		// register the message in the database, first the receiver's collection
		messageSavedToReceiver.save(function (savingError, savedMessageToReceiver) {
			if (savingError) {
				callback(500, null, "Error occurred while saving the message initially", savingError);
			} else {
				// TODO - somehow send the message in the receiver's phone... HERE

				// updates the receiver's chat collections, and add the new one if it's not there already
				User.findOne({_id: ruid_}, function (findingError, receiverFound) {
					if (findingError) {
						callback(500, null, "Error occurred while updating the receiver's chat collections.", findingError);
					} else if (!isEmpty(receiverFound)) {
						// if the receiver is not empty then we save this new collection
						let newReceiverCollection = {
							chat_collection_name: `${ruid_}${suid_}`,
							recipient: `${suid_}`
						};
						// we check inside of the receiver's chat collections
						for (let i = 0; i < receiverFound.chat_collections.length; i++) {
							if (newReceiverCollection.chat_collection_name === receiverFound.chat_collections[i].chat_collection_name) {
								// if this chat has been saved, then we just don't add it and move forward
								saveToSender();
								break;
							} else if (i === receiverFound.chat_collections.length - 1) {
								receiverFound.chat_collections.push(newReceiverCollection); // push this if it's not in that array
								saveToSender();
							}
						}
					} else {
						callback(500, null, "Didn't find user that this message was sent to, BAD.", true);
					}
				});

			}
		});
	}

	// function to save the message to the sender's collections
	function saveToSender() {
		messageSavedToSender.save(function (savingError, savedMessageToSender) {
			if (savingError) {
				callback(500, null, "Error occurred while saving the message initially. However, receiver has received it", savingError);
			} else {
				// savedMessageToSender cannot be null at this point

				// updates the sender's chat collections, and add the new one if it's not there already
				User.findOne({_id: suid_}, function (findingError, senderFound) {
					if (findingError) {
						callback(500, null, "Error occurred while updating the receiver's chat collections.", findingError);
					} else if (!isEmpty(senderFound)) {
						// if the sender is not empty then we save this new collection
						let newSenderCollection = {
							chat_collection_name: `${suid_}${ruid_}`,
							recipient: `${ruid_}`
						};
						// we check inside of the receiver's chat collections
						for (let i = 0; i < senderFound.chat_collections.length; i++) {
							if (newSenderCollection.chat_collection_name === senderFound.chat_collections[i].chat_collection_name) {
								// if this chat has been saved, then we just don't add it and move forward
								callback(201, savedMessageToSender, "Message sent successfully", false);
								break;
							} else if (i === senderFound.chat_collections.length - 1) {
								senderFound.chat_collections.push(newSenderCollection); // push this if it's not in that array
								callback(201, savedMessageToSender, "Message sent successfully", false);
							}
						}
					}
				});

			}
		});
	}
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* GET all the messages
 * curl -X GET http://localhost:3000/message_get_all?suid=<SUID>&ruid=<RUID>
 * */
router.get('/message_get_all', function (request, response, next) {
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

	// extract the message from request
	let uuid_ = sf_req(request, "suid", "message_send");
	let ruid_ = sf_req(request, "ruid", "message_send");

	// create the parameters to send back just in case
	let parameters = {uuid: isEmpty(uuid_) ? null : uuid_, ruid: isEmpty(ruid_) ? null : ruid_};

	if (isEmpty(uuid_) || isEmpty(ruid_)) {
		callback(403, null, {
			message: "Some or all of the required parameters were empty",
			given_parameters: parameters
		}, true);
	} else {
		getMessages();
	}

	function getMessages() {
		let MessageModel = MessageCreator(uuid_, ruid_);
		MessageModel.find({}, function (retrievingError, messages) {
			if (retrievingError) {
				callback(500, null, "Error occurred while retrieving messages", retrievingError);
			} else if (isEmpty(messages)) {
				callback(404, null, "No message found", false);
			} else {
				// send the messages back to user if we find them
				callback(200, messages, "Messages found", false);
			}
		});
	}
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* GET all the messages that are unread
 * curl -X GET http://localhost:3000/message_get_unread?suid=<SUID>&ruid=<RUID>
 * */
router.get('/message_get_unread', function (request, response, next) {
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

	// extract the message from request
	let uuid_ = sf_req(request, "suid", "message_send");
	let ruid_ = sf_req(request, "ruid", "message_send");

	// create the parameters to send back just in case
	let parameters = {uuid: isEmpty(uuid_) ? null : uuid_, ruid: isEmpty(ruid_) ? null : ruid_};

	if (isEmpty(uuid_) || isEmpty(ruid_)) {
		callback(403, null, {
			message: "Some or all of the required parameters were empty",
			given_parameters: parameters
		}, true);
	} else {
		getMessages();
	}

	function getMessages() {
		let MessageModel = MessageCreator(uuid_, ruid_);
		MessageModel.find({}, function (retrievingError, messages) {
			if (retrievingError) {
				callback(500, null, "Error occurred while retrieving messages", retrievingError);
			} else if (isEmpty(messages)) {
				callback(404, null, "No message found", false);
			} else {
				// send the messages back to user if we find them
				retrieveUnread(messages);
			}
		});
	}

	function retrieveUnread(messages) {
		for (let i = messages.length - 1; i >= 0; i++) {
			if (messages[i].read) {
				// one we read the first unread message, we return from that list all the messages
				if (i === messages.length - 1) {
					// if the last message in the index is read, that means we don't add to it
					callback(200, null, "All messages are read", false);
				} else {
					// we don't want to return the message that is read, so we we do i+1
					callback(200, messages.slice(i + 1), "Messages found", false);
				}
				break;
			}
		}
	}
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */


/* POST reads all the messages (make them "read")
 * curl -X POST http://localhost:3000/message_get_unread?suid=<SUID>&ruid=<RUID>
 * */
router.post('/message_read', function (request, response, next) {
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

	// extract the message from request
	let uuid_ = sf_req(request, "suid", "message_send");
	let ruid_ = sf_req(request, "ruid", "message_send");

	// create the parameters to send back just in case
	let parameters = {uuid: isEmpty(uuid_) ? null : uuid_, ruid: isEmpty(ruid_) ? null : ruid_};

	if (isEmpty(uuid_) || isEmpty(ruid_)) {
		callback(403, null, {
			message: "Some or all of the required parameters were empty",
			given_parameters: parameters
		}, true);
	} else {
		readMessages();
	}

	function readMessages() {
		let MessageModel = MessageCreator(uuid_, ruid_);
		MessageModel.find({}, function (retrievingError, messages) {
			if (retrievingError) {
				callback(500, null, "Error occurred while retrieving messages", retrievingError);
			} else if (isEmpty(messages)) {
				callback(204, null, "No message found", false);
			} else {
				// read all the messages by setting them to "true"
				for (let i = 0; i < messages.length; i++) {
					messages[i].read = true;
					messages[i].save();
				}
				callback(200, null, "All messages are read now", false);
			}
		});
	}
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* GET login */
router.get('/login', function (request, response, next) {
	// curl -X GET http://localhost:3000/login?email=test@test.test
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

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* GET travel notices. This is probably the hardest method to implement.
 * curl -X GET http://localhost:3000/travels?to=sat&from=sea&day_by=20&month_by=12&year_by=2018
 * curl -X GET https://mysterious-headland-54722.herokuapp.com/travels?to=sat&from=sea&day_by=20&month_by=12&year_by=2018
 * */
router.get('/travels', function (request, response, next) {
	// TODO - ENDPOINT /travels INCOMPLETE, REMOVE 501 ON COMPLETION
	/*
	 curl -X GET https://mysterious-headland-54722.herokuapp.com/travels?to=Boston&from=San%20Francisco&day_by=41&month_by=4&year_by=2018
	 curl -X GET http://localhost:3000/travels?to=Boston&from=San%20Francisco&day_by=41&month_by=4&year_by=2018
	 curl --header "APC-Auth: 96dc04b3fb" -X GET https://www.air-port-codes.com/airport-codes-api/multi/demo?term=newark
	 curl --header "APC-Auth: 96dc04b3fb, Referer: https://www.air-port-codes.com/airport-codes-api/multi/" -X GET https://www.air-port-codes.com/api/v1/multi?term=newark
	 curl --header "APC-Auth: b76ea0b73d" -X GET https://www.air-port-codes.com/api/v1/multi?term=newark
	 curl --header "APC-Auth: b76ea0b73d" https://www.air-port-codes.com/api/v1/multi?term=newark
	 https://www.air-port-codes.com/api/v1/multi?term=LAX&APC-Auth=b76ea0b73d
	 THIS:
	 curl --header "APC-Auth: b76ea0b73d" -X GET https://www.air-port-codes.com/api/v1/multi?term=newark
	 GIVES THIS ERROR:
	 {"status":false,"statusCode":400,"message":"We can't seem to find a referrer for you. You may need to create an API Secret for your account. Login to your AIR-PORT-CODES account to create an API Secret.","term":"newark"}
	 */
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

	// get the from's and too's from the request with the dateby
	let fromQuery = sf_req(request, "from", "travels");
	let toQuery = sf_req(request, "to", "travels");
	let dayBy = sf_req_int(request, "day_by", "travels");
	let monthBy = sf_req_int(request, "month_by", "travels");
	let yearBy = sf_req_int(request, "year_by", "travels");
	let requestObject = {from: fromQuery, to: toQuery, day_by: dayBy, month_by: monthBy, year_by: yearBy};

	// create the options for the requests and final variables
	let optionsFrom = {
		url: `https://www.air-port-codes.com/api/v1/multi?term=${fromQuery}`,
		method: "GET",
		headers: {
			"APC-Auth": "c301986eb3",
			"APC-Auth-Secret": "4c4de6bc0ea3f5b"
		}
	};

	let optionsTo = {
		url: `https://www.air-port-codes.com/api/v1/multi?term=${toQuery}`,
		method: "GET",
		headers: {
			"APC-Auth": "c301986eb3",
			"APC-Auth-Secret": "4c4de6bc0ea3f5b"
		}
	};
	// variable to hold the airports and functions to get them
	let airportsFrom, airportsTo;
	let callbackOnFrom = function (error_from, response_from, body_from) {
		// assuming all is correct, body_to will be the result
		if (error_from) {
			callback(502, null, "Internal Server Error", true);
		} else {
			airportsFrom = JSON.parse(body_from).airports; // this should be an array of airports
			if (isEmpty(airportsFrom) || isEmpty(airportsTo)) {
				callback(404, null, "No traveler found", false);
			} else {
				performSearch();
			}
		}
	};
	let callbackOnTo = function (error_to, response_to, body_to) {
		// assuming all is correct, body_to will be the result
		// error keeps happening, need an APC-Auth-Secret
		if (error_to) {
			callback(502, null, "Internal Server Error", true);
		} else {
			airportsTo = JSON.parse(body_to).airports; // this should be an array of airports
			if (body_to.statusCode === 401) {
				// make a callback failure
				callback(502, null, "API Key expired", true);
			} else {
				REQUEST_HTTP(optionsFrom, callbackOnFrom);
			}
		}
	};

	if (isEmpty(fromQuery) || isEmpty(toQuery) || isEmpty(dayBy) || isEmpty(monthBy) || isEmpty(yearBy)) {
		// if any of those are empty, we can't perform search
		callback(403, null, {
			message: `Some or all of parameters were not specified. All parameters are required.`,
			given: requestObject
		}, true);
	} else {
		// make the request for to
		REQUEST_HTTP(optionsTo, callbackOnTo);
	}

	// performing search from airports to and from
	function performSearch() {
		// find all the travel notices
		TravelNotice.find({}, function (error, search) {
			if (error) {
				// handle error, interval server or database error while calling to find travelNotices
				callback(500, null, 'Internal Server Error', error);
			} else if (search) {
				// Filter the list for elements that matched the search
				performSearchFinal(search);
			} else {
				// return null if there was no search found
				callback(200, null, 'No travel notice found in the database', false);
			}
		});
	}

	function performSearchFinal(resultsFromSearch) {
		let RES = resultsFromSearch.slice(0); // copy the list of result
		let TEMP = [];
		// get matches from Airports From
		// - get the list of from airports iata
		let IATA_FROM = [];

		for (let i = 0; i < airportsFrom.length; i++) {
			IATA_FROM.push(airportsFrom[i]["iata"]);
		}
		// - see if any of those matches the resulting search
		for (let i = 0; i < RES.length; i++) {
			for (let j = 0; j < IATA_FROM.length; j++) {
				if (RES[i].dep_iata === IATA_FROM[j]) {
					TEMP.push(RES[i]);
					break;
				}
			}
		}

		// get matches from Airports to in the matches from
		// - get the list of from airports iata
		let IATA_TO = [];
		for (let i = 0; i < airportsTo.length; i++) {
			IATA_TO.push(airportsTo[i]["iata"]);
		}
		RES = [];
		// - see if any of those matches the resulting search
		for (let i = 0; i < TEMP.length; i++) {
			for (let j = 0; j < IATA_TO.length; j++) {
				if (TEMP[i].arr_iata === IATA_TO[j]) {
					RES.push(TEMP[i]);
					break;
				}
			}
		}

		// now match by the time
		TEMP = [];
		for (let i = 0; i < RES.length; i++) {
			if (yearBy > RES[i].arr_year) {
				TEMP.push(RES[i]);
			} else if (yearBy === RES[i].arr_year) {
				if (monthBy > RES[i].arr_month) {
					TEMP.push(RES[i]);
				} else if (monthBy === RES[i].arr_month) {
					if (dayBy >= RES[i].arr_day) {
						// this pushes it a bit too close
						TEMP.push(RES[i]);
					}
					// otherwise we don't add the travel notice at RES[i]
				}
				// otherwise we don't add the travel notice at RES[i]
			}
			// otherwise we don't add the travel notice at RES[i]
		}
		// declare filters here!
		let filtersOn = false;
		if (!isEmpty(sf_req(request, "filters_on", "travels"))) {
			filtersOn = sf_req_bool(request, "filters_on", "travels");
		}

		if (filtersOn && false && TEMP.length <= 0) { // TODO - when filtering is done, remove the && false
			performSearchFiltering(TEMP);
		} else {
			// if res is empty here, we make a 404 callback
			if (TEMP.length <= 0) {
				callback(404, null, "No travel notice found. please modify search queries.", false); // JUST FOR NOW
			} else {
				callback(200, TEMP, "Results found!", false);
			}
		}
	}

	function performSearchFiltering(currentSearchResults) {
		// TODO - do more filtering on RES based on filters
		callback(501, null, "Filtering not implemented"); // JUST FOR NOW
	}
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* POST send or receive request
 * curl -X POST http://localhost:3000/request
 * curl -X POST http://localhost:3000/request?travel_notice_id=596a79585749ad1f3b77234b&ruid=5967d57baf06e6606c442961&item_envelopes=true&item_smbox=false&item_lgbox=false&item_clothing=false&item_other=false&item_total=1&sending=false&receiving=false
 * */
router.post("/request_send", function (request, response, next) {
	/* send or receive request sent to a specific user from query
	 or body, in the DB, this creates a new request. */

	// callback once we get the result
	let callback = function (status_, request_, travel_notice_, message_, error_) {
		// callback for responding to send to user
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_) {
			server_response = {success: false, request: null, travel_notice: null, message: message_, error: error_};
		} else if (request_ === null) {
			// if we get to here that means travel_notice_ is not empty
			server_response = {success: false, request: null, travel_notice: null, message: message_, error: false};
		} else {
			server_response = {
				success: true,
				request: request_,
				travel_notice: travel_notice_,
				message: message_,
				error: false
			};
		}
		response.send(JSON.stringify(server_response));
	};

	// populate the new request
	let requestedCount = sf_req_int(request, "item_total", "request_send");
	let action = sf_req_int(request, "action", "request_send");
	// - this tests whether the requester is neither receiving nor sending something
	let SENDRECEIVEBOOLEAN = !(action === 0 || action === 1);
	// - if they are both false, both negations will be true thus making that true
	let itemOther = sf_req_bool(request, "item_other", "request_send");
	// - default to null
	let itemOtherName = itemOther ? sf_req(request, "item_other_name", "request_send") : null;
	// - create variables needed for population
	let recipient_ = {
		name: sf_req(request, "recipient_name", "request_send"),
		email: sf_req(request, "recipient_email", "request_send"),
		phone: sf_req(request, "recipient_phone", "request_send"),
		uses_app: sf_req_bool(request, "recipient_uses_app", "request_send")
	};
	let deliverer_ = {
		name: sf_req(request, "deliverer_name", "request_send"),
		email: sf_req(request, "deliverer_email", "request_send"),
		phone: sf_req(request, "deliverer_phone", "request_send"),
		uses_app: sf_req_bool(request, "deliverer_uses_app", "request_send")
	};
	// a way to check if deliverer or recipient is empty
	let isEmptyDelivererAndRecipient = isEmpty(recipient_.name) || isEmpty(recipient_.email) || isEmpty(recipient_.uses_app);
	isEmptyDelivererAndRecipient = isEmptyDelivererAndRecipient || isEmpty(deliverer_.name) || isEmpty(deliverer_.email) || isEmpty(deliverer_.uses_app);
	// - continue population
	let ruid = sf_req(request, "ruid", "request");
	let newRequest = new ShippingRequest({
		travel_notice_id: sf_req(request, "travel_notice_id", "request_send"),
		ruid: ruid, // we assume the requester exists in DB
		action: action, // is this person sending it
		status: 0,
		recipient: recipient_,
		deliverer: deliverer_,
		item_envelopes: sf_req_bool(request, "item_envelopes", "request_send"),
		item_smbox: sf_req_bool(request, "item_smbox", "request_send"),
		item_lgbox: sf_req_bool(request, "item_lgbox", "request_send"),
		item_clothing: sf_req_bool(request, "item_clothing", "request_send"),
		item_fragile: sf_req_bool(request, "item_fragile", "request_send"),
		item_liquid: sf_req_bool(request, "item_liquid", "request_send"),
		item_other: itemOther,
		item_other_name: itemOtherName,
		item_total: requestedCount,
		drop_off_flexibility: sf_req(request, "drop_off_flexibility", "request_send"),
		pick_up_flexibility: sf_req(request, "pick_up_flexibility", "request_send")
	});

	// we need to have at least 1 item requested so throw an error
	if (requestedCount < 1 || isNaN(requestedCount)) {
		// will throw error if not found in request
		callback(403, null, null, `CLIENT ERROR: Requester must request at least 1 item to ship. Was ${requestedCount}`, true);
	} else if (SENDRECEIVEBOOLEAN) {
		// at least one of them must be true
		callback(403, null, null, `CLIENT ERROR: Requester must either be sending a package or receiving one. action was ${action}.`, true);
	} else if (isEmptyDelivererAndRecipient) {
		callback(403, null, null, `CLIENT ERROR: Deliverer or recipient is not given in parameters. Given ${deliverer_} and ${recipient_}`, true);
	} else {
		TravelNotice.findOne({_id: sf_req(request, "travel_notice_id", "request")}, function (err, tn, next) {
			if (err) {
				callback(500, null, null, err, true);
			} else if (tn === null) {
				callback(403, null, null, "Requested travel does not exist", true);
			} else {
				// if we found a matching travel notice, we save this request

				// create a function for saving this request to the user's lists of requests
				let save_request_to_user = function (savedRequest, savedTn) {
					// find the user
					User.findOne({_id: ruid}, function (findingUSRError, userFound) {
						if (findingUSRError) {
							callback(500, savedRequest, savedTn, "Error in findingUSRError", true);
						} else if (isEmpty(userFound)) {
							// TODO - Delete the saved request, this should never happen
							callback(403, savedRequest, savedTn, "User was not found! Wth...", true);
						} else {
							// modify content
							try {
								userFound.requests_ids.push(savedRequest._id.valueOf());
							} catch (e) {
								userFound.requests_ids = [savedRequest._id.valueOf()];
							}
							userFound.save(function (savingUSRError, userSaved) {
								if (savingUSRError) {
									callback(500, savedRequest, savedTn, "Error in savingUSRError", true);
								} else {
									// final callback
									callback(201, savedRequest, savedTn, "Saved successfully", false);
								}
							});
						}
					});
					// save the request to him
				};

				// create the function for saving this request to the travel notice
				let save_request_to_tn = function () {
					newRequest.save(function (saving_error, request_saved) {
						// this will throw an error if one of the required variables is not given.
						if (!saving_error) {
							// we add rs_add to the travel notice requests_ids
							let rs_add = {
								user_id: request_saved.ruid,
								request_id: request_saved._id.valueOf()
							};
							try {
								// the array be not be initialized so we do a try catch. However, it should be initialized!
								tn.requests_ids.push(rs_add);
								tn.save(function (tnSavingError, newTN) {
									if (tnSavingError) {
										callback(500, null, null, "Error in tnSavingError", tnSavingError);
									} else {
										save_request_to_user(request_saved, newTN);
									}
								});

							} catch (err) {
								console.log("ERROR IN tn.requests_ids_push", err);
								tn.requests_ids = [];
								tn.requests_ids.push(rs_add);
								tn.save(function (tnSavingError, newTN) {
									if (tnSavingError) {
										callback(500, null, null, "Error in tnSavingError", tnSavingError);
									} else {
										save_request_to_user(request_saved, newTN);
									}
								});
							}
						} else {
							console.log(`\n\n\n * * * ** Saving error occured\n\n\n`, saving_error);
							callback(500, null, null, saving_error, true);
						}
					});
				};

				// then, first check if this request is already saved
				let requestSent = false;
				for (let i = 0; i < tn.requests_ids.length; i++) {
					let test_request = tn.requests_ids[i];
					/* here, we're checking if the specific travel_notice being requested contains
					 the user that is sending this request. If that user has not sent a request
					 to this travel notice, then his id cannot appear in this travel notice */
					if (test_request.user_id == sf_req(request, "ruid", "request")) {
						requestSent = true;
					}
					if (i >= tn.requests_ids.length - 1) {
						if (!requestSent) {
							// if i is the last index and the request has not been sent, save it
							save_request_to_tn();
							// we wait for the last index because of NodeJS's a-synchronousness
						} else {
							callback(403, null, null, "Request has already been sent", true);
						}
					} else if (requestSent) {
						// else move to last index to speed it up
						i = tn.requests_ids.length - 2;
					}
				}
			}
		});
	}
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/* POST send or receive request, changes status from 0 to 1
 * curl -X POST http://localhost:3000/request_accept
 *
 * */
router.post("/request_accept", function (request, response, next) {
	// callback once we get the result
	let callback = function (status_, request_, travel_notice_, message_, error_) {
		// callback for responding to send to user
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_) {
			server_response = {success: false, request: null, travel_notice: null, message: message_, error: error_};
		} else if (request_ === null) {
			// if we get to here that means travel_notice_ is not empty
			server_response = {success: false, request: null, travel_notice: null, message: message_, error: false};
		} else {
			server_response = {
				success: true,
				request: request_,
				travel_notice: travel_notice_,
				message: message_,
				error: false
			};
		}
		response.send(JSON.stringify(server_response));
	};

	let request_id = sf_req(request, 'request_id', 'request_accept');
	let traveler_id = sf_req(request, 'traveler_id', 'request_accept');
	let travel_notice_id = sf_req(request, 'travel_notice_id', 'request_accept');

	if (isEmpty(request_id) || isEmpty(traveler_id)) {
	}
	// find the specific request
	ShippingRequest.findOne({_id: request_id}, function (findingSRError, shippingRequest) {
		if (findingSRError) {
			callback(500, null, null, "Internal Server Error in findingSRError", findingSRError);
		} else if (isEmpty(shippingRequest)) {
			callback(404, null, null, "Request not found", false);
		} else {
			shippingRequest.status = 1; // status
			// confirm that the user has this travelnotice by checking that the id of the request is in the travel notice
			TravelNotice.findOne({_id: travel_notice_id}, function (findingTVLError, travelNotice) {
				if (findingTVLError) {
					callback(500, null, null, "Internal Server Error in findingTVLError", findingTVLError);
				} else if (isEmpty(shippingRequest)) {
					callback(403, null, null, "Travel notice not found", false);
				} else {
					// check if request_id is in this travel notice
					for (let i = 0; i < travelNotice.requests_ids.length; i++) {
						let test_request = travelNotice.requests_ids[i];
						if (test_request.request_id == request_id) {
							// save the request if we find it
							shippingRequest.save(function (savingError, savedRequest) {
								if (savingError) {
									callback(500, null, travelNotice, "Error while saving the request. Travel notice was found however", savingError);
								} else {
									callback(201, savedRequest, travelNotice, "Request accepted", false);
								}
							});
							break;
						}
						if (i >= travelNotice.requests_ids.length - 1) {
							callback(403, null, null, "Request not found in Travel notice", true);
						}
					}
				}
			});
		}
	});
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* POST send or receive request, changes status from 0 to 2
 * curl -X POST http://localhost:3000/request_decline
 *
 * */
router.post("/request_decline", function (request, response, next) {
	// callback once we get the result
	let callback = function (status_, request_, travel_notice_, message_, error_) {
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_) {
			server_response = {success: false, request: null, travel_notice: null, message: message_, error: error_};
		} else if (request_ === null) {
			// if we get to here that means travel_notice_ is not empty
			server_response = {success: false, request: null, travel_notice: null, message: message_, error: false};
		} else {
			server_response = {
				success: true,
				request: request_,
				travel_notice: travel_notice_,
				message: message_,
				error: false
			};
		}
		response.send(JSON.stringify(server_response));
	};

	let request_id = sf_req(request, 'request_id', 'request_accept');
	let traveler_id = sf_req(request, 'traveler_id', 'request_accept');
	let travel_notice_id = sf_req(request, 'travel_notice_id', 'request_accept');

	if (isEmpty(request_id) || isEmpty(traveler_id) || isEmpty(travel_notice_id)) {
		callback(403, null, null, `Some or all of the parameters given are empty. `, true);
	}
	// find the specific request
	ShippingRequest.findOne({_id: request_id}, function (findingSRError, shippingRequest) {
		if (findingSRError) {
			callback(500, null, null, "Internal Server Error in findingSRError", findingSRError);
		} else if (isEmpty(shippingRequest)) {
			callback(404, null, null, "Request not found", false);
		} else {
			shippingRequest.status = 2; // status
			// confirm that the user has this travelnotice by checking that the id of the request is in the travel notice
			TravelNotice.findOne({_id: travel_notice_id}, function (findingTVLError, travelNotice) {
				if (findingTVLError) {
					callback(500, null, null, "Internal Server Error in findingTVLError", findingTVLError);
				} else if (isEmpty(shippingRequest)) {
					callback(403, null, null, "Travel notice not found", false);
				} else {
					// check if request_id is in this travel notice
					for (let i = 0; i < travelNotice.requests_ids.length; i++) {
						let test_request = travelNotice.requests_ids[i];
						if (test_request.request_id == request_id) {
							// save the request if we find it
							shippingRequest.save(function (savingError, savedRequest) {
								if (savingError) {
									callback(500, null, travelNotice, "Error while saving the request. Travel notice was found however", savingError);
								} else {
									callback(201, savedRequest, travelNotice, "Request accepted", false);
								}
							});
							break;
						}
						if (i >= travelNotice.requests_ids.length - 1) {
							callback(403, null, null, "Request not found in Travel notice", true);
						}
					}
				}
			});
		}
	});
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* GET one users wants to see all the requests that he has sent
 * curl -X GET http://localhost:3000/request_get_my
 *
 * */
router.get("/request_get_my", function (request, response, next) {

	// callback for responding to send to user
	let callback = function (status_, requestArray_, message_, error_) {
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_) {
			server_response = {success: false, data: null, message: message_, error: error_};
		} else if (isEmpty(requestArray_)) {
			// if we get to here that means travel_notice_ is not empty
			server_response = {success: false, data: requestArray_, message: message_, error: false};
		} else {
			server_response = {success: true, data: requestArray_, message: message_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	// initialize the list of requests to be sent to an empty list
	let requestList = [];

	// set the uid of the user that is asking to see his requests
	let uid = sf_req(request, "uid", "request_get_my");

	// find all requests and rule out those that are bad
	ShippingRequest.find({}, function (findingError, requests) {
		if (findingError) {
			callback(500, null, "Internal Server Error at findingError", findingError);
		} else if (isEmpty(requests)) {
			callback(404, null, "No requests found", true);
		} else {
			for (let i = 0; i < requests.length; i++) {
				if (requests[i].ruid === uid) {
					requestList.push(requests[i]);
				}
				if (i >= requests.length - 1) {
					callback(200, requestList, "Request found may be empty", false);
				}
			}
		}
	});
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* GET one users wants to see all the requests that people sent to him
 * curl -X GET http://localhost:3000/request_get_to_me?uid=5977a6ca44f8d217b87f7819
 *
 * curl -X GET http://localhost:3000/request_get_to_me?uid=5977a6ca44f8d217b87f7819
 * */
router.get("/request_get_to_me", function (request, response, next) {

	// callback for responding to send to user
	let callback = function (status_, requestIDArray_, message_, error_) {
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_) {
			server_response = {success: false, data: requestIDArray_, message: message_, error: error_};
		} else if (isEmpty(requestIDArray_)) {
			// if we get to here that means travel_notice_ is not empty
			server_response = {success: false, data: requestIDArray_, message: message_, error: false};
		} else {
			server_response = {success: true, data: requestIDArray_, message: message_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	// initialize the list of requests to be sent to an empty list
	let requestIDList = [];
	function removeEmptyBracket(requestArray){
		// trying to get rid of the empty brackets
		let res = [];
		for (let i = 0; i < requestArray.length; i++){
			if (requestArray[i] !== "[]"){
				res.push(requestArray[i]);
			}
		}
		return res;
	}

	// set the uid of the user that is asking to see his requests
	let uid = sf_req(request, "uid", "request_get_to_me");

	// find all requests and rule out those that are bad
	User.findOne({_id: uid}, function (findingError, userFound) {
		if (findingError) {
			callback(500, null, "Internal Server Error at findingError", findingError);
		} else if (isEmpty(userFound) || userFound === null) {
			callback(404, null, "User is not found", true);
		} else {
			// loop through each travel notice and get all the requestsids that are associated with it
			if (userFound.travel_notices_ids.length === 0) {
				// if this uses made no travel notice, there
				callback(404, null, "No travel notice ever created by user", true);
			} else {
				for (let i = 0; i < userFound.travel_notices_ids.length; i++) {
					TravelNotice.findOne({_id: userFound.travel_notices_ids[i]}, function (findingErrorTN, travelNoticeFound) {
						if (findingErrorTN) {
							// server error, we should continue because it's minor ish
							if (i >= userFound.travel_notices_ids.length - 1) {
								// if we're at the end we make the final callback
								if (requestIDList.length === 0) {
									callback(404, requestIDList, "list is empty, minor error happened at findingErrorTN", false);
								} else {
									callback(200, removeEmptyBracket(requestIDList), "success, but minor error happened at findingErrorTN", false);
								}
							}
						} else if (isEmpty(travelNoticeFound)) {
							if (i >= userFound.travel_notices_ids.length - 1) {
								// if we're at the end we make the final callback
								if (requestIDList.length === 0) {
									callback(404, requestIDList, "list is empty, travel notices were empty", false);
								} else {
									callback(200, removeEmptyBracket(requestIDList), "success, but travel notices were empty", false);
								}
							}
						} else {
							// if we find that request id, then we concatenate it into the list
							if (travelNoticeFound.requests_ids.length > 0) {
								requestIDList = requestIDList.concat(travelNoticeFound.requests_ids);
								if (i >= userFound.travel_notices_ids.length - 1) {
									// if we're at the end we make the final callback
									if (requestIDList.length === 0) {
										callback(404, requestIDList, "list is empty", false);
									} else {
										callback(200, removeEmptyBracket(requestIDList), "success", false);
									}
								}
							} else if (i >= userFound.travel_notices_ids.length - 1) {
								// if we're at the end we make the final callback
								if (requestIDList.length === 0) {
									callback(404, requestIDList, "list is empty", false);
								} else {
									callback(200, removeEmptyBracket(requestIDList), "success", false);
								}
							}
						}
					});
				}
			}
		}
	});
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* GET one users wants to see all the requests that people sent to him
 * curl -X GET http://localhost:3000/request_get_my
 * */
router.get("/request_get", function (request, response, next) {
	// callback for responding to send to user
	let callback = function (status_, request_, message_, error_) {
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_) {
			server_response = {success: false, data: null, message: message_, error: error_};
		} else if (isEmpty(request_)) {
			// if we get to here that means travel_notice_ is not empty
			server_response = {success: false, data: null, message: message_, error: false};
		} else {
			server_response = {success: true, data: request_, message: message_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	// set the uid of the user that is asking to see his requests
	let request_id = sf_req(request, "uid", "request_get");

	ShippingRequest.findOne({_id: request_id}, function (findingError, requestFound) {
		if (findingError) {
			callback(500, null, "Internal Server error.", findingError);
		} else if (isEmpty(requestFound)) {
			callback(404, null, "Request not found", true);
		} else {
			callback(200, requestFound, "Found", false);
		}
	});
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

router.post("/request_delete", function (request, response, next) {
	// callback once we get the result
	let callback = function (status_, request_, travel_notice_, message_, error_) {
		// callback for responding to send to user
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_) {
			server_response = {success: false, request: null, travel_notice: null, message: message_, error: error_};
		} else if (request_ === null) {
			// if we get to here that means travel_notice_ is not empty
			server_response = {success: false, request: null, travel_notice: null, message: message_, error: false};
		} else {
			server_response = {
				success: true,
				request: request_,
				travel_notice: travel_notice_,
				message: message_,
				error: false
			};
		}
		response.send(JSON.stringify(server_response));
	};

	callback(501, null, null, "Not implemented", true);
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* POST add a travel notice to the database
 * curl -X POST http://localhost:3000/travel_notice_add?tuid=5977a6de44f8d217b87f781a&airline_iata=AA&airline_name=AmericanAirline&flight_num=494&item_envelopes=true&item_smbox=true&item_lgbox=true&item_clothing=true&item_fragile=true&item_liquid=true&item_other=true&dep_airport_name=departurebrooooo&dep_iata=TES&dep_city=TES&dep_min=1&dep_hour=1&dep_day=1&dep_month=1&dep_year=2001&arr_airport_name=THISISSOAIRPORTY&arr_iata=TES&arr_city=TES&arr_min=1&arr_hour=1&arr_day=1&arr_month=1&arr_year=2499
 * curl -X POST https://mysterious-headland-54722.herokuapp.com/travel_notice_add?tuid=5967d57baf06e6606c442961&airline_iata=AA&airline_name=AmericanAirline&flight_num=494&item_envelopes=true&item_smbox=true&item_lgbox=true&item_clothing=true&item_fragile=true&item_liquid=true&item_other=true&dep_airport_name=LOLDEPARTUREOTHEONE&dep_iata=TES&dep_city=TES&dep_min=1&dep_hour=1&dep_day=1&dep_month=1&dep_year=1&arr_airport_name=LOLARRIVALOTHERONE&arr_iata=TES&arr_city=TES&arr_min=1&arr_hour=1&arr_day=1&arr_month=1&arr_year=4
 * */
router.post("/travel_notice_add", function (request, response, next) {
	// This assumes that variables got from request are correct

	// callback for when request is over
	let callback = function (status_, data_, message_, error_) {
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_) {
			server_response = {success: false, data: data_, message: message_, error: error_};
		} else if (data_ === null) {
			server_response = {success: false, data: data_, message: message_, error: false};
		} else {
			server_response = {success: true, data: data_, message: message_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	let dropFlex = sf_req(request, "drop_off_flexibility", "travel_notice_add");
	let pickFlex = sf_req(request, "pick_up_flexibility", "travel_notice_add");
	// get the variables from the request
	let travelNotice = new TravelNotice({
		tuid: sf_req(request, "tuid", "travel_notice_add"),
		airline_iata: sf_req(request, "airline_iata", "travel_notice_add"),
		airline_name: sf_req(request, "airline_name", "travel_notice_add"),
		flight_num: sf_req(request, "flight_num", "travel_notice_add"),
		item_envelopes: sf_req_bool(request, "item_envelopes", "travel_notice_add"),
		item_smbox: sf_req_bool(request, "item_smbox", "travel_notice_add"),
		item_lgbox: sf_req_bool(request, "item_lgbox", "travel_notice_add"),
		item_clothing: sf_req_bool(request, "item_clothing", "travel_notice_add"),
		item_fragile: sf_req_bool(request, "item_fragile", "travel_notice_add"),
		item_liquid: sf_req_bool(request, "item_liquid", "travel_notice_add"),
		item_other: sf_req_bool(request, "item_other", "travel_notice_add"),
		drop_off_flexibility: isEmpty(dropFlex) ? "" : dropFlex,
		pick_up_flexibility: isEmpty(pickFlex) ? "" : pickFlex,
		dep_airport_name: sf_req(request, "dep_airport_name", "travel_notice_add"),
		dep_iata: sf_req(request, "dep_iata", "travel_notice_add"),
		dep_city: sf_req(request, "dep_city", "travel_notice_add"),
		dep_min: sf_req_int(request, "dep_min", "travel_notice_add"),
		dep_hour: sf_req_int(request, "dep_hour", "travel_notice_add"),
		dep_day: sf_req_int(request, "dep_day", "travel_notice_add"),
		dep_month: sf_req_int(request, "dep_month", "travel_notice_add"),
		dep_year: sf_req_int(request, "dep_year", "travel_notice_add"),
		arr_airport_name: sf_req(request, "arr_airport_name", "travel_notice_add"),
		arr_iata: sf_req(request, "arr_iata", "travel_notice_add"),
		arr_city: sf_req(request, "arr_city", "travel_notice_add"),
		arr_min: sf_req_int(request, "arr_min", "travel_notice_add"),
		arr_hour: sf_req_int(request, "arr_hour", "travel_notice_add"),
		arr_day: sf_req_int(request, "arr_day", "travel_notice_add"),
		arr_month: sf_req_int(request, "arr_month", "travel_notice_add"),
		arr_year: sf_req_int(request, "arr_year", "travel_notice_add")
		// requests_ids: [] this should be null (or an empty array) since it's a fresh new travel_notice
	});

	// place this in the database
	travelNotice.save(function (saving_error, savedTravelNotice) {
		// this will throw an error if one of the required variables is not given.
		if (saving_error) {
			// in case of error, handle that
			callback(500, null, "Error in saving_error to save travel notice", saving_error);
		} else if (isEmpty(savedTravelNotice)) {
			// if savedTravelNotice is null, then an error occurred somewhere and this was not saved
			callback(500, null, "savedTravelNotice was empty, which does not make sense", true);
		} else {
			// if savedTravelNotice is null, then send it
			// first find the user
			User.findOne({_id: sf_req(request, "tuid", "travel_notice_add")}, function(findingUSRError, userFound){
				if (findingUSRError) {
					// delete the just saved travel notice
					TravelNotice.remove({_id:savedTravelNotice._id});
					callback(403, null, "Error at finding the new user (findingUSRError)", findingUSRError); // TODO - Say user error occurred and was not found
				} else if (isEmpty(userFound)) {
					// delete the just saved travel notice
					TravelNotice.remove({_id:savedTravelNotice._id});
					callback(403, null, "User is empty or not saved in the database. This is not allowed.", true);
				} else {
					let userSavingFunction = function() {
						// function to save the user
						userFound.save(function (savingError, userSaved) {
							if (savingError) {
								callback(201, savedTravelNotice, "Error at savingError for saving user, however, travel notice has been saved", true);
							} else if (isEmpty(userSaved)) {
								// if savedTravelNotice is null, then an error occurred somewhere and this was not saved
								callback(500, null, "User saved was null, which does not make sense, however, travel notice has been saved", true);
							} else {
								callback(201, savedTravelNotice, "Travel notice saved successfully", false);
							}
						});
					};
					// since we're pushing to an array, we have to be careful that the array has not been initialized
					try {
						userFound.travel_notices_ids.push(savedTravelNotice._id);
						userSavingFunction();
					} catch (e) {
						userFound.travel_notices_ids = [];
						userFound.travel_notices_ids.push(savedTravelNotice._id);
						userSavingFunction();
					}
				}
			});
		}
	});
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

router.post("/travel_notice_update", function (request, response, next) {
	// curl -X POST http://localhost:3000/travel_notice_update?_id=59763c14a6f2640011b97309&tuid=596d0b5626bffc280b32187e&airline=DL&flight_num=1798&item_envelopes=true&item_smbox=true&item_lgbox=true&item_clothing=true&item_other=false&dep_iata=SAN&dep_city=SanDiego&dep_min=45&dep_hour=21&dep_day=1&dep_month=8&dep_year=2017&arr_iata=JFK&arr_city=NewYork&arr_min=14&arr_hour=6&arr_day=2&arr_month=8&arr_year=2017
	// callback once we get the result
	let callback = function (status_, data_, message_, error_) {
		// callback for responding to send to user
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_) {
			server_response = {success: false, data: null, message: message_, error: error_};
		} else if (data_ === null) {
			// if we get to here that means travel_notice_ is not empty, so this is practically useless
			server_response = {success: false, data: null, message: message_, error: false};
		} else {
			server_response = {success: true, data: data_, message: message_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	// get items to identify the request id
	let R_id = sf_req(request, "_id", "travel_notice_update");
	let Rtuid = sf_req(request, "tuid", "travel_notice_update");

	// get items to be updated
	let Ritem_envelopes = sf_req(request, "item_envelopes", "travel_notice_add");
	let Ritem_smbox = sf_req(request, "item_smbox", "travel_notice_add");
	let Ritem_lgbox = sf_req(request, "item_lgbox", "travel_notice_add");
	let Ritem_clothing = sf_req(request, "item_clothing", "travel_notice_add");
	let Ritem_fragile = sf_req(request, "item_fragile", "travel_notice_add");
	let Ritem_liquid = sf_req(request, "item_liquid", "travel_notice_add");
	let Ritem_other = sf_req(request, "item_other", "travel_notice_add");
	let Rdrop_off_flexibility = sf_req(request, "drop_off_flexibility", "travel_notice_update");
	let Rpick_up_flexibility = sf_req(request, "pick_up_flexibility", "travel_notice_update");
	let Rrequests = sf_req(request, "requests_ids", "travel_notice_update");

	// parameters for debugging
	let parameters = {
		item_envelopes: Ritem_envelopes,
		item_smbox: Ritem_smbox,
		item_lgbox: Ritem_lgbox,
		item_clothing: Ritem_clothing,
		item_fragile: Ritem_fragile,
		item_liquid: Ritem_liquid,
		item_other: Ritem_other,
		drop_off_flexibility: Rdrop_off_flexibility,
		pick_up_flexibility: Rpick_up_flexibility,
		requests: Rrequests
	};

	if (isEmpty(R_id) || isEmpty(Rtuid)) {
		callback(403, null, `Either id or travel_notice_id or both were empty. travel_notice_id: ${R_id}, tuid:${Rtuid}`, true);
	} else {
		// find the specific travel notice to be updated, which is referred with BOTH _id and tuid
		TravelNotice.findOne({_id: R_id, tuid: Rtuid}, function (error, foundTravelNotice) {
			if (error) {
				callback(500, null, "Internal Server Error", error);
			} else if (foundTravelNotice === null) {
				// if the data is null, that means that travel notice didn't exist
				callback(404, null, "Travel notice was not found!", false);
			} else {
				// if we get the data, we update it then send it to user
				// update stuffs if they are not empty
				if (!isEmpty(Ritem_envelopes)) foundTravelNotice.item_envelopes = sf_req(request, "item_envelopes", "travel_notice_update");
				if (!isEmpty(Ritem_smbox)) foundTravelNotice.item_smbox = sf_req_bool(request, "item_smbox", "travel_notice_add");
				if (!isEmpty(Ritem_lgbox)) foundTravelNotice.item_lgbox = sf_req_bool(request, "item_lgbox", "travel_notice_add");
				if (!isEmpty(Ritem_clothing)) foundTravelNotice.item_clothing = sf_req_bool(request, "item_clothing", "travel_notice_add");
				if (!isEmpty(Ritem_fragile)) foundTravelNotice.item_fragile = sf_req_bool(request, "item_fragile", "travel_notice_add");
				if (!isEmpty(Ritem_liquid)) foundTravelNotice.item_liquid = sf_req_bool(request, "item_liquid", "travel_notice_add");
				if (!isEmpty(Ritem_other)) foundTravelNotice.item_other = sf_req_bool(request, "item_other", "travel_notice_add");
				if (!isEmpty(Rdrop_off_flexibility)) foundTravelNotice.drop_off_flexibility = Rdrop_off_flexibility;
				if (!isEmpty(Rpick_up_flexibility)) foundTravelNotice.pick_up_flexibility = Rpick_up_flexibility;
				if (!isEmpty(Rrequests)) foundTravelNotice.requests_ids = Rrequests;

				foundTravelNotice.save(function (err, savedTravelNotice) {
					if (err) {
						// if an error occurred, send an error
						callback(500, null, "Internal Server Error", error);
					} else if (isEmpty(savedTravelNotice)) {
						// if it's empty it makes no sense because it shouldn't be! So, there's an error
						callback(500, null, "Saved Travel was empty! An unknown error must have occurred.", true);
					} else {
						// otherwise, we're good
						callback(202, savedTravelNotice, {
							message: "Travel notice updated successfully!",
							parameters_received: parameters
						}, false);
					}
				});
			}
		});
	}

});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* GET gets one travel notice from the DB
 * curl -X POST http://localhost:3000/travel_notice_get
 * */
router.get("/travel_notice_get", function (request, response, next) {
	// callback once we get the result
	let callback = function (status_, travel_notice_, message_, error_) {
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_) {
			server_response = {success: false, data: null, message: message_, error: error_};
		} else if (travel_notice_ === null) {
			// if we get to here that means travel_notice_ is not empty
			server_response = {success: false, data: null, message: message_, error: false};
		} else {
			server_response = {success: true, data: travel_notice_, message: message_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	// get the required items to find this travel notice
	let travelNoticeId = sf_req(request, "travel_notice_id", "travel_notice_get");

	if (isEmpty(travelNoticeId)) {
		callback(403, null, `Some of the parameters were not given. Travel notice id was: ${travelNoticeId}`, true);
	} else {
		// perform the search
		TravelNotice.findOne({
			_id: travelNoticeId
		}, function (error, data) {
			if (error) {
				callback(500, null, "Internal Server Error", error);
			} else if (data === null) {
				// if the data is null, that means that travel notice didn't exist
				callback(404, null, "Travel Notice not found", false);
			} else {
				// if we get the data, we send it to the user
				callback(200, data, "Successful", false);
			}
		});
	}
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* POST deletes a travel notice from the DB
 * curl -X POST http://localhost:3000/travel_notice_delete
 * curl -X POST http://localhost:3000/travel_notice_delete?tuid=5967d57baf06e6606c442961&travel_notice_uid=<PLACE HERE>
 * */
router.post("/travel_notice_delete", function (request, response, next) {

	// callback once we get the result
	let callback = function (status, data, error) {
		// TODO - modify to add messages
		response.setHeader('Content-Type', 'application/json');
		response.status(status);
		let server_response;
		if (error) {
			server_response = {success: false, data: null, error: error};
		}
		else {
			server_response = {success: true, data: data, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	// remove the travel notice
	let id = sf_req(request, "travel_notice_uid", "travel_notice_delete");
	let tuid = sf_req(request, "tuid", "travel_notice_delete");

	TravelNotice.remove({_id: id, tuid: tuid}, function (error, data) {
		if (error) {
			// if there is an error, that means we didn't find it
			callback(500, null, error);
		} else if (data["n"] >= 1) {
			// if we deleted at least one item, then make a successful callback
			callback(202, data, false);
		} else {
			// otherwise, that means this travel notice didn't exist so return a 404 error
			callback(404, data, true);
		}
	});
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* See all travel notices from the database
 * curl -X GET http://localhost:3000/travel_notice_all
 * */
router.get("/travel_notice_all", function (request, response, next) {
	// callback when result is received
	let callback = function (status, data, error) {
		// TODO - modify to add messages
		response.setHeader('Content-Type', 'application/json');
		response.status(status);
		let server_response;
		if (error) {
			server_response = {success: false, data: null, error: error};
		}
		else {
			server_response = {success: true, data: data, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	// returns a list of all the travel notices currently saved in the database
	TravelNotice.find({}, function (error, search) {
		if (error) {
			// do what to do in case of an error
			callback(500, null, error);
		} else {
			// else send the search
			callback(200, search, false);
		}
	});
});

router.get("/test_2", function (request, response, next) {
	response.status(410).send("Gone!!!");
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

module.exports = router;

/* ===================================================
 * 
 * Heroku pushes:
 * 
 * git add <files>
 * git commit -m "messages"
 * git push origin master
 * 
 * git push heroku master # seems like it pushes from computer without needing git :-O
 * 
 * To run locally:
 * heroku local
 * # if we do web, it does what's in web
 * 
 * ================================================ */

/* ===================================================
 * 
 * LINK: https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html 
 * 200 (OK)
 * 201 (Created. The new resource has been created)
 * 202 (Accepted. The request has been accepted for processing, but the processing has not been completed)
 * 203 (Non-Authoritative Information)
 * 204 (No Content. The server has fulfilled the request but does not need to return an entity-body)
 * 205 (Resent Content. Request fulfilled, but user agent SHOULD reset the document view which caused the request to be sent)
 * 
 * 300 (Multiple Choices. For redirects?)
 * 301 (Moved Permanently. The requested resource has been assigned a new permanent URI and any future references to this resource SHOULD use one of the returned URIs)
 * 302 (Found. The requested resource resides temporarily under a different URI)
 * 303 (See Other. The response to the request can be found under a different URI and SHOULD be retrieved using a GET method on that resource)
 * 304 (Not Modified. Not sure what this does)
 * 307 (Temporary Redirect)
 *
 * 400 (Bad Request. Endpoint not understood by server)
 * 401 (Unauthorized. Endpoint requires user authentication)
 * 402 (Payment Required)
 * 403 (Forbidden. The server understood the request but refused to fulfill it)
 * 404 (Not Found. The server did not find anything matching the request URI)
 * 405 (Not Allowed)
 * 406 (Not Acceptable)
 * 407 (Proxy Authentication Required)
 * 408 (Request Timeout)
 * 409 (Conflict. The request could not be completed due to a conflict with the current state of the resource)
 * 410 (Gone. Endpoint does not exist anymore / resource no longer available)
 *
 * 500 (Internal Server Error)
 * 501 (Not Implemented. The server does not support the functionality required to fulfill request)
 * 502 (Bad Gateway. The server received an invalid response from the upstream server it accessed while attempting to fulfill the request.)
 * 503 (Service Unavailable. The server is currently unable to handle the request due to temporary maintenance)
 * 504 (Gateway Timeout. Did not receive a request from upstream serve while attempting to fulfill request)
 * 505 (HTTP Version Not Supported. The server does not support the HTTP protocol version that was used in the request message)
 * 
 * ================================================ */