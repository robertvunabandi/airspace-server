const chalk = require('chalk');

let sf_req = function (request, stringName, tag = null) {
	let result = request.body[stringName] === undefined || request.body[stringName] === null ? request.query[stringName] : request.body[stringName];
	if (result === null || result === undefined) {
		let folder = tag === null ? "" : tag;
		// it seems like chalk is causing server to crash
		console.log(` ** * W/${folder}: Both query and result are null or undefined for ${stringName}`);
	}
	return result;
};

let log_separator = function (count) {
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
};

let isEmpty = function (element) {
	// returns a boolean of whether this element is empty
	return element === null || element === undefined;
};

let helpers = {
	fromMStoDate: function (ms) {
		// returns an array, [dd, mm, yyyy, hour, min, second] in integer values in military time,
		let d = new Date(ms);
		// MONTH IS ONE INDEX LOWER, SO 0 IS JANUARY
		return [d.getUTCDate() - 1, d.getUTCMonth(), d.getUTCFullYear(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()];
	},
	isANumber: function (element) {
		return (typeof(element) !== "object") && !isNaN(element) && (typeof(element) === 'number' || (typeof(parseInt(element)) === 'number' && !isNaN(parseInt(element))));
	},
	isEmpty: function (element) {
		return isEmpty(element);
	},
	isEmptyArray: function (array) {
		return array.length === 0;
	},
	newDate: function () {
		let monthStrings = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
		let d = new Date(Date.now());
		d.setTime(d.getTime() + d.getTimezoneOffset() * 60 * 1000);
		return {
			day: d.getUTCDate() - 1,
			month: d.getUTCMonth(),
			year: d.getUTCFullYear(),
			hour: d.getUTCHours(),
			min: d.getUTCMinutes(),
			sec: d.getUTCSeconds(),
			simple: `${d.getUTCMonth() + 1}/${d.getUTCDate() - 1}/${d.getUTCFullYear()}`,
			verbose: `${monthStrings[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
		};
	},
	LOG: {
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
	},
	log_separator: function (count) {
		// for debugging purposes
		log_separator(count);
	},
	log_requested_items: function (request) {
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
	},
	random: {
		integer: function(maxValueInclusive) {
			return Math.round(Math.random()*maxValueInclusive);
		},
		double: function(maxValue, decimalPlaces) {
			let value = Math.random()*maxValue;
			return Math.round(value*10**decimalPlaces) / 10**decimalPlaces;
		}
	},
	sf_req: function (request, stringName, tag = null) {
		/* functions to get variables from requests safely
		 sf stands for "save from request". Body is favored*/
		return sf_req(request, stringName, tag);
	},
	sf_req_bool: function (request, stringName, tag = null) {
		/* functions to get booleans from requests safely */
		let res = sf_req(request, stringName, tag);
		if (typeof(res) === "string") return res === "true";
		else if (typeof(res) === "boolean") return res;
		else {
			let folder = tag === null ? "" : tag;
			console.log(` ** * W/${folder}: type of "${stringName}" is neither boolean nor string. Default set to false. This may cause errors.`);
			return false;
		}

	},
	sf_req_int: function (request, stringName, tag = null) {
		/* functions to get integers from requests safely */
		let folder = tag === null ? "" : tag;
		let res = sf_req(request, stringName, tag);
		if (isNaN(res)) {
			console.log(` ** * W/${folder}[${stringName}]: received NaN. Will return 0. This may cause errors.`);
			return 0;
		} else {
			return parseInt(res);
		}

	},
	callbackFormatorData: function (HTTPResponse) {
		// creates a callback with the results in order, always include message, success, and error
		return function (status_, data_, message_, error_) {
			HTTPResponse.setHeader('Content-Type', 'application/json');
			HTTPResponse.status(status_);
			let server_response;
			if (error_) {
				server_response = {success: false, data: data_, message: message_, error: error_};
			} else if (isEmpty(data_)) {
				server_response = {success: false, data: data_, message: message_, error: false};
			} else {
				server_response = {success: true, data: data_, message: message_, error: false};
			}
			setTimeout(function () {
				// safely send the request
				HTTPResponse.send(JSON.stringify(server_response));
			}, 0);
		};
	},
	callbackFormatorDataUsr: function (HTTPResponse) {
		// creates a callback with the results in order, always include message, success, and error
		return function (status_, data_, user_, message_, error_) {
			HTTPResponse.setHeader('Content-Type', 'application/json');
			HTTPResponse.status(status_);
			let server_response;
			if (error_) {
				server_response = {success: false, data: data_, user:user_, message: message_, error: error_};
			} else if (isEmpty(data_) || isEmpty(user_)) {
				server_response = {success: false, data: data_, user:user_, message: message_, error: false};
			} else {
				server_response = {success: true, data: data_, user:user_, message: message_, error: false};
			}
			setTimeout(function () {
				// safely send the request
				HTTPResponse.send(JSON.stringify(server_response));
			}, 0);
		};
	},
	callbackFormatorSrTn: function (HTTPResponse) {
		// creates a callback with the results in order, always include message, success, and error response is different
		return function (status_, sr_, tn_, message_, error_) {
			HTTPResponse.setHeader('Content-Type', 'application/json');
			HTTPResponse.status(status_);
			let server_response;
			if (error_) {
				server_response = {success: false, request: sr_, travel_notice: tn_, message: message_, error: error_};
			} else if (isEmpty(sr_) || isEmpty(tn_)) {
				server_response = {success: false, request: sr_, travel_notice: tn_, message: message_, error: false};
			} else {
				server_response = {success: true, request: sr_, travel_notice: tn_, message: message_, error: false};
			}


			setTimeout(function () {
				// safely send the request
				HTTPResponse.send(JSON.stringify(server_response));
			}, 0);
		};
	},
	callbackFormatorSrTnUsr: function (HTTPResponse) {
		// creates a callback with the results in order, always include message, success, and error response is different
		return function (status_, sr_, tn_, usr_, message_, error_) {
			HTTPResponse.setHeader('Content-Type', 'application/json');
			HTTPResponse.status(status_);
			let server_response;
			if (error_) {
				server_response = {
					success: false,
					request: sr_,
					travel_notice: tn_,
					user: usr_,
					message: message_,
					error: error_
				};
			} else if (isEmpty(sr_) || isEmpty(tn_) || isEmpty(usr_)) {
				server_response = {
					success: false,
					request: sr_,
					travel_notice: tn_,
					user: usr_,
					message: message_,
					error: false
				};
			} else {
				server_response = {
					success: true,
					request: sr_,
					travel_notice: tn_,
					user: usr_,
					message: message_,
					error: false
				};
			}

			setTimeout(function () {
				// safely send the request
				HTTPResponse.send(JSON.stringify(server_response));
			}, 0);
		};
	},
	callbackFormatorTnUsr: function (HTTPResponse) {
		// creates a callback with the results in order, always include message, success, and error response is different
		return function (status_, tn_, usr_, message_, error_) {
			HTTPResponse.setHeader('Content-Type', 'application/json');
			HTTPResponse.status(status_);
			let server_response;
			if (error_) {
				server_response = {success: false, travel_notice: tn_, user: usr_, message: message_, error: error_};
			} else if (isEmpty(tn_) || isEmpty(usr_)) {
				server_response = {success: false, travel_notice: tn_, user: usr_, message: message_, error: false};
			} else {
				server_response = {success: true, travel_notice: tn_, user: usr_, message: message_, error: false};
			}

			setTimeout(function () {
				// safely send the request
				HTTPResponse.send(JSON.stringify(server_response));
			}, 0);
		};
	},
	IFFF: function (error, fxnError, objectCheck, fxnEmpty, fxnGood) {
		if (error) {
			fxnError(error);
		} else if (isEmpty(objectCheck)) {
			fxnEmpty();
		} else {
			fxnGood(objectCheck);
		}
	}, /** BELOW ARE VARIABLES */
	AIRPORT_APC_AUTH: "a546348859", // used to be c301986eb3
	AIRPORT_APC_AUTH_SECRET: "dfee68f6260a0e4" // used to be 4c4de6bc0ea3f5b

};

module.exports = helpers;