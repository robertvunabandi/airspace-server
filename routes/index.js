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
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// curl -X GET http://localhost:3000/test
router.get('/test', function (request, response, next) {
	response.setHeader('Content-Type', 'application/json');
	response.send(JSON.stringify({numbers: [0, 1, 2, 3, 4, 5, 6], names: ["Ruben", "Amanda", "Robert"]}));
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* GET travel notices. This is probably the hardest method to implement.
 * curl -X GET http://localhost:3000/travels?to=sat&from=sea&day_by=20&month_by=12&year_by=2018&uid=
 * curl -X GET https://mysterious-headland-54722.herokuapp.com/travels?to=sat&from=sea&day_by=20&month_by=12&year_by=2018
 * */
router.get('/travels', function (request, response, next) {
	// callback once we get the result
	let callback = helpers.callbackFormatorData(response);
	// get the id of the user
	let _id_ = sf_req(request, "uid", "travels");
	// get the from's and too's from the request with the dateby
	let fromQuery = sf_req(request, "from", "travels");
	let toQuery = sf_req(request, "to", "travels");
	let dayBy = sf_req_int(request, "day_by", "travels");
	let monthBy = sf_req_int(request, "month_by", "travels");
	let yearBy = sf_req_int(request, "year_by", "travels");
	let requestObject = {id: _id_, from: fromQuery, to: toQuery, day_by: dayBy, month_by: monthBy, year_by: yearBy};

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

	if (isEmpty(fromQuery) || isEmpty(toQuery) || isEmpty(dayBy) || isEmpty(monthBy) || isEmpty(yearBy) || isEmpty(_id_)) {
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

		if (filtersOn && false && TEMP.length <= 0) { // TODO (STRETCH) - when filtering is done, remove the && false
			performSearchFiltering(TEMP);
		} else {
			// if res is empty here, we make a 404 callback
			if (TEMP.length <= 0) {
				callback(404, null, "No travel notice found. please modify search queries.", false);
			} else {
				performRulingOutUser(TEMP);
			}
		}
	}

	let performRulingOutUser = function (listTravelNotices) {
		// removes any travel notice sent by the person directly making the search
		let res = [];
		for (let i = 0; i < listTravelNotices.length; i++) {
			if (listTravelNotices[i].tuid !== _id_) {
				res.push(listTravelNotices[i]);
				if (i >= listTravelNotices.length - 1) {
					sendResults(res);
				}
			} else if (i >= listTravelNotices.length - 1) {
				sendResults(res);

			}
		}
	};

	let sendResults = function (resultRuled) {
		// sends the results by first checking if the result is empty, if it is, send a 404, otherwise send it
		if (resultRuled.length <= 0) {
			callback(404, null, "No travel notice found. please modify search queries.", false);
		} else {
			callback(200, resultRuled, "Results found!", false);
		}

	};

	function performSearchFiltering(currentSearchResults) {
		// TODO (STRETCH) - do more filtering on RES based on filters
		callback(501, null, "Filtering not implemented"); // JUST FOR NOW
		// at the end, do performRulingOutUser(TEMP);
	}
});


/* GET travel notices. This is probably the hardest method to implement.
 * curl -X GET http://localhost:3000/travels_all?to=sat&from=sea&day_by=20&month_by=12&year_by=2018&uid=
 * curl -X GET https://mysterious-headland-54722.herokuapp.com/travels?to=sat&from=sea&day_by=20&month_by=12&year_by=2018
 * */
router.get('/travels_all', function (request, response, next) {
	// callback once we get the result
	let callback = helpers.callbackFormatorData(response);
	// get the id of the user
	let _id_ = sf_req(request, "uid", "travels");
	// get the from's and too's from the request with the dateby
	let dayBy = sf_req_int(request, "day_by", "travels");
	let monthBy = sf_req_int(request, "month_by", "travels");
	let yearBy = sf_req_int(request, "year_by", "travels");
	let requestObject = {uid: ""+_id_, day_by: ""+dayBy, month_by: ""+monthBy, year_by: ""+yearBy};

	if (isEmpty(dayBy) || isEmpty(monthBy) || isEmpty(yearBy) || isEmpty(_id_)) {
		// if any of those are empty, we can't perform search
		callback(403, null, {
			message: `Some or all of parameters were not specified. All parameters are required.`,
			given: requestObject
		}, true);
	} else {
		// make the request for to
		performSearch();
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

		// now match by the time given in the parameters
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

		if (filtersOn && false && TEMP.length <= 0) { // TODO (STRETCH) - when filtering is done, remove the && false
			performSearchFiltering(TEMP);
		} else {
			// if res is empty here, we make a 404 callback
			if (TEMP.length <= 0) {
				callback(404, null, "No travel notice found. please modify search queries.", false);
			} else {
				performRulingOutUser(TEMP);
			}
		}
	}

	let performRulingOutUser = function (listTravelNotices) {
		// removes any travel notice sent by the person directly making the search
		let res = [];
		for (let i = 0; i < listTravelNotices.length; i++) {
			if (listTravelNotices[i].tuid !== _id_) {
				res.push(listTravelNotices[i]);
				if (i >= listTravelNotices.length - 1) {
					sendResults(res);
				}
			} else if (i >= listTravelNotices.length - 1) {
				sendResults(res);

			}
		}
	};

	let sendResults = function (resultRuled) {
		// sends the results by first checking if the result is empty, if it is, send a 404, otherwise send it
		if (resultRuled.length <= 0) {
			callback(404, null, "No travel notice found. please modify search queries.", false);
		} else {
			callback(200, resultRuled, "Results found!", false);
		}
	};

	function performSearchFiltering(currentSearchResults) {
		// TODO (STRETCH) - do more filtering on RES based on filters
		callback(501, null, "Filtering not implemented"); // JUST FOR NOW
		// at the end, do performRulingOutUser(TEMP);
	}
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
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