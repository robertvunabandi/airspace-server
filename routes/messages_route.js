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

/* POST send message
 * curl -X POST http://localhost:3000/message_send
 **/
router.post("/send", function (request, response, next) {
	// TODO - Make sure to fix notifications
	// message a user via chats TODO - May change based on socket for messaging

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
				// TODO - somehow send the message in the receiver's phone... HERE VIA NOTIFICATIONS

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

/* GET all the messages
 * curl -X GET http://localhost:3000/message_get_all?suid=<SUID>&ruid=<RUID>
 * */
router.get('/get_all', function (request, response, next) {
	// TODO - Make sure to fix also notifications
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

/* GET all the messages that are unread
 * curl -X GET http://localhost:3000/message_get_unread?suid=<SUID>&ruid=<RUID>
 * */
router.get('/get_unread', function (request, response, next) {
	// TODO - Fix with notifications
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

/* POST reads all the messages (make them "read")
 * curl -X POST http://localhost:3000/message_get_unread?suid=<SUID>&ruid=<RUID>
 * */
router.post('/read', function (request, response, next) {
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

module.exports = router;

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */