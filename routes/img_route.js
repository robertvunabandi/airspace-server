const express = require('express'); const router = express.Router();
// Schemas
const User = require('../schemas/user.js');
const TravelNotice = require('../schemas/travel_notice.js');
const ShippingRequest = require('../schemas/request.js');
const Notification = require('../schemas/notification.js');
const MessageCreator = require('../schemas/message.js');
const ProfileImageBMP = require('../schemas/profile_image.js');
// to make http calls
const http = require('http'); const REQUEST_HTTP = require('request');
// helpers
const helpers = require('../helpers.js');
const img_hlps = require('../img_hlps.js');
/* debugging functions */
const LOG = helpers.LOG; const log_separator = helpers.log_separator; const log_requested_items = helpers.log_requested_items;
const sf_req = helpers.sf_req; const sf_req_bool = helpers.sf_req_bool; const sf_req_int = helpers.sf_req_int;
const isEmpty = helpers.isEmpty; const isEmptyArray = helpers.isEmptyArray; const isANumber = helpers.isANumber;

const fs = require('fs');
// curl -X GET http://localhost:3000/image/save_local_img
router.get('/save_local_img', function(request, response) {
	let img = new ProfileImageBMP({
		user_id: "test_local",
		bmp: fs.readFileSync(__dirname+"/xsoccerBall.png"),
		content_type: "image/png",
		date_saved: helpers.newDate()
	});

	img.save(function (savingError, imageSaved) {
		if (savingError) {
			response.send("ERROR OCCURED");
		} else {
			response.contentType(imageSaved.content_type);
			response.send(imageSaved.bmp);
		}
	});

});

/** POST Save profile image
 * curl -X POST http://localhost:3000/image/profile_save
 */
router.post('/profile_save', function(request, response, next) {
	// callback for result
	let TAG = "/image/profile_save"; // for debugging
	let callback = img_hlps.callbackFormatorData(response);


	// Getting request parameters
	// - get the image from request and convert it
	let image = sf_req(request, "image", TAG); // needs to be a string or an array
	// - create other variables
	let bmp_, reqContentType, profileImage;

	let continueStart = function() {
		bmp_ = img_hlps.convertImageToBmp(image);
		// - get the request content type
		reqContentType = img_hlps.getReqContentType(request, TAG);
		profileImage = new ProfileImageBMP({
			user_id: sf_req(request, "user_id", TAG),
			bmp: bmp_,
			content_type: reqContentType,
			date_saved: helpers.newDate()
		});

		let parameters = {
			user_id: sf_req(request, "user_id", TAG), bmp: bmp_, content_type: reqContentType
		};

		helpers.log_separator(2);
		console.log(parameters);
		helpers.log_separator(2);
		saveImage();
	};



	// TODO - IMPLEMENT THESE
	if (isEmpty(image)) {
		callback(503, {message: "Not implemented Endpoint (IMAGE IS EMPTY)", received_content_type: null}, null, true);
	} else {
		continueStart();
	}

	function saveImage() {
		profileImage.save(function(savingError, savedImg){
			if (savingError) {
				callback(500, {message: "Internal Server Error", received_content_type: null}, null, true);
			} else {
				callback(200, savedImg.bmp, savedImg.content_type, false);
			}
		});
		//response.send("NOT IMPLEMENTED");
		// callback(503, {message: "Not implemented Endpoint", received_content_type: profileImage.contentType}, profileImage.contentType, true);
	}
});

// curl -X GET http://localhost:3000/image/get_profile_image\?image_id\=5982397b42126b00110ac8f9
router.get('/get_profile_image', function(request, response, next) {
	let callback = helpers.callbackFormatorData(response);
	let TAG = "/image/get_profile_image";
	let imageId = sf_req(request, "image_id", TAG);
	ProfileImageBMP.findOne({_id: imageId}, function(findingError, foundImg){
		if (findingError) {
			callback(500, null, "Internal Server Error", findingError);
		} else if (isEmpty(foundImg)) {
			callback(500, null, "image not found", true);
		} else {
			// callback(200, foundImg, "Image received", false);
			response.contentType(foundImg.content_type);
			response.send(foundImg.bmp);
		}
	});
	// response.send(JSON.stringify({message: false}));
});
module.exports = router;