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

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* GET new user into database
 * curl -X POST http://localhost:3000/notifications_add?uid=<id>
 *
 * */
router.post('/add', function (request, response, next) {
	// callback function to call at the end
	let callback = function (status_, savedNotification_, message_, error_) {
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_ !== false) {
			server_response = {success: false, message: message_, data: null, error: error_};
		} else if (isEmpty(savedNotification_)) {
			server_response = {success: false, message: message_, data: null, error: false};
		} else {
			server_response = {success: true, message: message_, data: savedNotification_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};
	let n = new Notification({
		user_id: "test",
		message: "test notification",
		sent: false,
		date_received: helpers.newDate(),
		action: 999
	});

	n.save(function (savingError, savedN) {
		if (savingError) {
			callback(500, null, "Internal Server Error", savingError);
		} else {
			callback(200, savedN, "Saved", false);
		}
	});
});
/* GET new user into database
 * curl -X GET http://localhost:3000/notifications_get?uid=test
 *
 * */
router.get('/get', function (request, response, next) {
	// callback function to call at the end
	let callback = function (status_, notificationArray_, message_, error_) {
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_ !== false) {
			server_response = {success: false, message: message_, data: null, error: error_};
		} else if (isEmpty(notificationArray_)) {
			server_response = {success: false, message: message_, data: null, error: false};
		} else {
			server_response = {success: true, message: message_, data: notificationArray_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	let user_id = sf_req(request, "uid", "notifications/get");
	// get all the notifications that belong to this user

	if (isEmpty(user_id)) {
		callback(403, null, "User id not specified!", true);
	} else {
		Notification.find({user_id: user_id}, function (findingError, foundNotifications) {
			if (findingError) {
				callback(500, null, "Internal Server Error", findingError);
			} else if (isEmpty(foundNotifications)) {
				callback(404, null, "You have no notifications.", false);
			} else {
				sendResult(foundNotifications);
			}
		});
	}

	// send a 404 if the array is empty, otherwise send it
	let sendResult = function (arrayList) {
		if (isEmptyArray(arrayList)) {
			callback(404, null, "You have no notifications.", false);
		} else {
			callback(200, arrayList, "New notifications", false);
			for (let i = 0; i < arrayList.length; i++) {
				arrayList[i].sent = true;
				arrayList[i].save();
			}
		}
	};
});

/* POST new user into database
 * curl -X POST http://localhost:3000/notifications_delete_one?_id=597b828bef260f962a51c029
 *
 * */
router.post('/delete_one', function (request, response, next) {
	// callback function to call at the end
	let callback = function (status_, notificationDeleted_, message_, error_) {
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_ !== false) {
			server_response = {success: false, message: message_, data: null, error: error_};
		} else if (status_ != 200) {
			server_response = {success: false, message: message_, data: notificationDeleted_, error: false};
		} else {
			server_response = {success: true, message: message_, data: notificationDeleted_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	let notification_id = sf_req(request, "_id", "notifications_get");

	// delete the notification found by id
	if (isEmpty(notification_id)) {
		callback(403, null, "Id not specified!", true);
	} else {
		Notification.remove({_id: notification_id}, function (deletionError, deletedNotification) {
			if (deletionError) {
				callback(500, null, "Internal Server Error", deletionError);
			} else {
				callback(200, deletedNotification, "Notification deleted", false);
			}
		});
	}
});

module.exports = router;