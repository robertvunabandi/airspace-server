const express = require('express');
const router = express.Router();
// Schemas
const User = require('../schemas/user.js');
const TravelNotice = require('../schemas/travel_notice.js');
const ShippingRequest = require('../schemas/request.js');
const Notification = require('../schemas/notification.js');
const MessageCreator = require('../schemas/message.js');
const ProfileImageBMP = require('../schemas/profile_image.js');
const RequestImageBMP = require('../schemas/request_image.js');
// to make http calls
const http = require('http');
const REQUEST_HTTP = require('request');
// helpers
const helpers = require('../helpers.js');
const img_hlps = require('../img_hlps.js');
/* debugging functions */
const LOG = helpers.LOG;
const log_separator = helpers.log_separator;
const log_requested_items = helpers.log_requested_items;
const sf_req = helpers.sf_req;
const sf_req_bool = helpers.sf_req_bool;
const sf_req_int = helpers.sf_req_int;
const isEmpty = helpers.isEmpty;
const isEmptyArray = helpers.isEmptyArray;
const isANumber = helpers.isANumber;

const fs = require('fs');

/** POST Save profile image
 * curl -X POST http://localhost:3000/image/profile_save
 */
router.post('/profile_create', function (request, response, next) {
	// callback for result
	let TAG = "/image/profile_create"; // for debugging
	let callback = helpers.callbackFormatorData(response);

	// Getting request parameters
	let userId = sf_req(request, "user_id", TAG);
	let parameters = {user_id: "" + userId};

	let photoObject = new ProfileImageBMP();
	let savePhoto = function () {
		photoObject.save(function (savingError, photoObjectSaved) {
			if (savingError) {
				callback(500, null, "Internal Server Error", savingError);
			} else {
				callback(201, photoObjectSaved, "success", false);
			}
		});
	};

	if (isEmpty(userId)) {
		// send error
		callback(403, null, `user id not specified in parameters, given: ${parameters}`, true);
	} else {
		// save without url
		photoObject = new ProfileImageBMP({
			user_id: userId,
			url: img_hlps.PROFILE_IMAGE_PLACEHOLDER_URL, // set the placeholder url for this for now, which is an empty string
			date_saved: helpers.newDate()
		});
		// TODO - check if the user already has his created
		setTimeout(function () {
			savePhoto();
		}, 0);
	}
});

router.post('/profile_update', function (request, response, next) {
	// callback for result
	let TAG = "/image/profile_update"; // for debugging
	let callback = helpers.callbackFormatorData(response);

	// Getting request parameters
	let userId = sf_req(request, "user_id", TAG);
	let url = sf_req(request, "url", TAG);
	let parameters = {user_id: "" + userId, url: "" + url};

	if (isEmpty(userId) || isEmpty(url)) {
		// send error
		callback(403, null, `user id not specified in parameters, given: ${parameters}`, true);
	} else {
		// save with url
		ProfileImageBMP.findOne({user_id: userId}, function (findingError, foundPhotoObject) {
			let savePhotoObject = function () {
				foundPhotoObject.url = url;
				foundPhotoObject.date_saved = helpers.newDate();
				foundPhotoObject.save(function (savingError, savedPhotoObject) {
					if (savingError) {
						callback(500, null, "Internal Server Error", savingError);
					} else {
						callback(201, savedPhotoObject, "success", false);
					}
				});
			};

			if (findingError) {
				callback(500, null, "Internal Server Error", findingError);
			} else if (isEmpty(foundPhotoObject)) {
				callback(403, null, "Photo object not found", true);
			} else {
				savePhotoObject();
			}
		});
	}
});

router.get('/get_profile_url', function (request, response, next) {
	// callback for result
	let TAG = "/image/get_profile_url"; // for debugging
	let callback = helpers.callbackFormatorData(response);

	// Getting request parameters
	let userId = sf_req(request, "user_id", TAG);

	// find the url
	ProfileImageBMP.findOne({user_id: userId}, function (findingError, foundPhotoObject) {
		if (findingError) {
			callback(500, null, "Internal Server Error", findingError);
		} else if (isEmpty(foundImg)) {
			callback(403, null, "Url not found", true);
		} else {
			callback(403, foundPhotoObject.url, "success", false);
		}
	});
});

router.post('/request_create', function (request, response, next) {
	// TODO - Implement this endpoint
	// callback for result
	let TAG = "/image/request_create"; // for debugging
	let callback = helpers.callbackFormatorData(response);
	callback(503, null, "Not Implemented", true);
});
router.post('/request_update', function (request, response, next) {
	// TODO - Implement this endpoint
	// callback for result
	let TAG = "/image/request_update"; // for debugging
	let callback = helpers.callbackFormatorData(response);
	callback(503, null, "Not Implemented", true);
});
router.get('/get_request_url', function (request, response, next) {
	// TODO - Implement this endpoint
	// callback for result
	let TAG = "/image/get_request_url"; // for debugging
	let callback = helpers.callbackFormatorData(response);
	callback(503, null, "Not Implemented", true);
});

module.exports = router;