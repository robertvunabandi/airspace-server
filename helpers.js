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
		// returns a boolean of whether this element is empty
		return element === null || element === undefined;
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
	sf_req_int(request, stringName, tag = null) {
		/* functions to get integers from requests safely */
		let folder = tag === null ? "" : tag;
		let res = sf_req(request, stringName, tag);
		if (isNaN(res)) {
			console.log(` ** * W/${folder}[${stringName}]: received NaN. Will return 0. This may cause errors.`);
			return 0;
		} else {
			return parseInt(res);
		}

	}
};

module.exports = helpers;