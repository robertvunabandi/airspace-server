/**
 * Created by celestin on 7/31/17.
 */

/**
 * Created by celestin on 7/31/17.
 */
// chalk for logging stuffs with colors
const chalk = require('chalk');

const express = require('express');
const router = express.Router();

// Schemas
const User = require('../schemas/user.js');
const TravelNotice = require('../schemas/travel_notice.js');
const ShippingRequest = require('../schemas/request.js');
const Notification = require('../schemas/notification.js');
const MessageCreator = require('../schemas/message.js');

// helpers
const helpers = require('../helpers.js');

// to make http calls
const http = require('http');
const REQUEST_HTTP = require('request');

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
function isANumber(element){
	return (typeof(element) !== "object") && !isNaN(element) && (typeof(element) === 'number' || (typeof(parseInt(element)) === 'number' && !isNaN(parseInt(element))));
};

function isEmptyArray(array) {
	return array.length === 0;
}

router.get("/", function(request, response) {
	// callback function to call at the end
	let callback = function (status_, data_, message_, error_) {
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_ !== false) {
			server_response = {success: false, message: message_, data: data_, error: error_};
		} else if (data_ === null) {
			server_response = {success: false, message: message_, data: data_, error: false};
		} else {
			server_response = {success: true, message: message_, data: data_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	callback(500, null, "Not Implemented", true);
});

module.exports = router;