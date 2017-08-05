const express = require('express');
const router = express.Router();
// Schemas
const User = require('../schemas/user.js');
const TravelNotice = require('../schemas/travel_notice.js');
const ShippingRequest = require('../schemas/request.js');
const Notification = require('../schemas/notification.js');
const MessageCreator = require('../schemas/message.js');
// to make http calls
const http = require('http');
const REQUEST_HTTP = require('request');
// helpers
const helpers = require('../helpers.js');
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

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* POST add a travel notice to the database
 * curl -X POST http://localhost:3000/travel_notice/add?tuid=597fa392fb5eaf0011445f91&airline_iata=AA&airline_name=AmericanAirline&flight_num=494&item_envelopes=true&item_smbox=true&item_lgbox=true&item_clothing=true&item_fragile=true&item_liquid=true&item_other=true&dep_airport_name=departurebrooooo&dep_iata=TES&dep_city=TES&dep_min=1&dep_hour=1&dep_day=1&dep_month=1&dep_year=2001&arr_airport_name=THISISSOAIRPORTY&arr_iata=TES&arr_city=TES&arr_min=1&arr_hour=1&arr_day=1&arr_month=1&arr_year=2499
 * */
router.post("/add", function (request, response, next) {
	// This assumes that variables gotten from request are correct
	// TODO - Check if request has been created before by user

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
		arr_year: sf_req_int(request, "arr_year", "travel_notice_add"),
		pending_requests_count: 0, // when we just create a fresh new travel notice, we don't have any request to it
		accepted_requests_count: 0,
		date_created: helpers.newDate()
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
			User.findOne({_id: sf_req(request, "tuid", "travel_notice_add")}, function (findingUSRError, userFound) {
				if (findingUSRError) {
					// delete the just saved travel notice
					TravelNotice.remove({_id: savedTravelNotice._id});
					callback(403, null, "Error at finding the new user (findingUSRError), user associated was not found.", findingUSRError);
				} else if (isEmpty(userFound)) {
					// delete the just saved travel notice
					TravelNotice.remove({_id: savedTravelNotice._id});
					callback(403, null, "User is empty or not saved in the database. This is not allowed.", true);
				} else {
					let userSavingFunction = function () {
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

router.post("/update", function (request, response, next) {
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

/* GET gets one travel notice from the DB
 * curl -X GET http://localhost:3000/travel_notice/get?travel_notice_id=
 * */
router.get("/get", function (request, response, next) {
	// callback once we get the result
	let callback = helpers.callbackFormatorDataUsr(response);

	// get the required items to find this travel notice
	let travelNoticeId = sf_req(request, "travel_notice_id", "travel_notice_get");

	let findUser = function (TN) {
		User.findOne({_id: TN.tuid}, function (findingError, foundUser) {
			if (findingError) {
				callback(500, TN, null, "Internal Server error", findingError);
			} else if (isEmpty(foundUser)) {
				callback(403, TN, null, "User associated not found", true);
			} else {
				callback(200, TN, foundUser, "success", false);
			}
		});
	};

	if (isEmpty(travelNoticeId)) {
		callback(403, null, null, `Some of the parameters were not given. Travel notice id was: ${travelNoticeId}`, true);
	} else {
		// perform the search
		TravelNotice.findOne({
			_id: travelNoticeId
		}, function (error, data) {
			if (error) {
				callback(500, null, null, "Internal Server Error", error);
			} else if (data === null) {
				// if the data is null, that means that travel notice didn't exist
				callback(404, null, null, "Travel Notice not found", false);
			} else {
				// if we get the data, we send it to the user
				// but first find the user
				findUser(data);
			}
		});
	}
});

/* GET gets one travel notice from the DB
 * curl -X GET http://localhost:3000/travel_notice_get_mine?uid=597922c81527c200110fc33e
 * */
router.get("/get_mine", function (request, response, next) {
	// returns all the travel notices that the user (specified by uid) has sent to people

	// callback once we get the result
	let callback = function (status_, travel_notice_array_, message_, error_) {
		response.setHeader('Content-Type', 'application/json');
		response.status(status_);
		let server_response;
		if (error_) {
			server_response = {success: false, data: null, message: message_, error: error_};
		} else if (isEmpty(travel_notice_array_)) {
			// if we get to here that means travel_notice_ is not empty
			server_response = {success: false, data: null, message: message_, error: false};
		} else {
			server_response = {success: true, data: travel_notice_array_, message: message_, error: false};
		}
		response.send(JSON.stringify(server_response));
	};

	// get id in the request
	let _id_ = sf_req(request, "uid", "travel_notice_get_mine");
	if (isEmpty(_id_)) {
		callback(403, null, "Id not specified in parameters.", true);
	} else {
		// find all the travel notice and rule out those that don't belong to the specified user
		TravelNotice.find({tuid: _id_}, function (findingError, foundTns) {
			if (findingError) {
				callback(500, null, "Internal Server Error", findingError);
			} else if (isEmpty(foundTns)) {
				callback(404, null, "You either have no travel notice created yet.", false);
			} else {
				sendResult(foundTns);
			}
		});
	}

	// send a 404 if the array is empty, otherwise send it
	let sendResult = function (arrayList) {
		if (isEmptyArray(arrayList)) {
			callback(404, null, "You have no travel notice created yet.", false);
		} else {
			callback(200, arrayList, "Success", false);
		}
	};
});

/* POST deletes a travel notice from the DB
 * curl -X POST http://localhost:3000/travel_notice/delete
 * curl -X POST http://localhost:3000/travel_notice/delete?user_id=5985324e1aa22c0011a7b48f&travel_notice_id=59853650fe730f0011f67c0f
 * */
router.post("/delete", function (request, response, next) {

	// callback once we get the result to return the travel notice deleted
	let callback = helpers.callbackFormatorData(response);

	// remove the travel notice
	let travel_notice_id = sf_req(request, "travel_notice_id", "travel_notice_delete");
	let user_id = sf_req(request, "user_id", "travel_notice_delete");
	// put all in parameters
	let parameters = {travel_notice_id: "" + travel_notice_id, user_id: "" + user_id};

	let USER_OBJECT = null;
	let TRAVEL_NOTICE_OBJECT = null;
	let REQUEST_IDS_ARRAY = [];
	// for notifications
	let dateFlightDeparture;

	// wipe all the requests
	let wipeRequests = function () {
		console.log(`Deletion of requests started`);
		for (let i = 0; i < REQUEST_IDS_ARRAY.length; i++) {
			ShippingRequest.remove({_id: REQUEST_IDS_ARRAY[i].request_id}, function (deletionError, dataDeleted) {
				// log it for debugging purposes
				console.log(`Delete request (ID:${REQUEST_IDS_ARRAY[i]}) attempt, results:`);
				console.log(deletionError, dataDeleted.n);
				// at the end, log completion
				if (i >= REQUEST_IDS_ARRAY.length - 1) {
					setTimeout(function () {
						console.log(`Deletion of requests terminated`);
					}, 100);
				}
			});
		}
	};

	// delete the request itself
	let deleteTravelNotice = function () {
		TravelNotice.remove({_id: travel_notice_id}, function (deletionError, data) {
			wipeRequests();
			if (deletionError) {
				callback(500, null, "Internal Server Error occurred while deleting your travel notice", deletionError);
			} else {
				callback(200, data, "Success deletion", false);
			}
		});
	};

	// delete the travel notice in the user
	let deleteTravelNoticeInUser = function () {
		// remove it from the travel notice
		let MAX = USER_OBJECT.travel_notices_ids.length;

		if (MAX === 0) {
			deleteTravelNotice();
		} else {
			// save user
			let saveUser = function () {
				USER_OBJECT.save(function (savingError, savedUser) {
					if (savingError) {
						console.log(`MAJOR ERROR IN SAVING USER: ${USER_OBJECT}`);
						console.log(savingError);
					} else {
						// send a notification
						let n = new Notification({
							user_id: user_id,
							message: `You have successfully deleted your travel notice from ${TRAVEL_NOTICE_OBJECT.dep_city} to ${TRAVEL_NOTICE_OBJECT.arr_city} departing on ${dateFlightDeparture}. It should now be removed from our database.`,
							sent: false,
							date_received: helpers.newDate(),
							action: 30
						});
						n.save();
					}
					deleteTravelNotice();
				});
			};

			for (let i = 0; i < MAX; i++) {
				if (USER_OBJECT.travel_notices_ids[i] == travel_notice_id) {
					USER_OBJECT.travel_notices_ids.splice(i, 1);
					saveUser();
					break;
				} else if (i >= MAX - 1) {
					deleteTravelNotice();
				}
			}
		}
	};

	// delete the requests in the travel notice
	let deleteRequestIdsForEachUser = function () {

		let MAX = REQUEST_IDS_ARRAY.length;
		let deleteUserAtIndex = function (index) {
			return new Promise(function (resolve, reject) {
				let sendResponse = function () {
					// resolve if there's more index to go, reject when we reach the max value - 1
					if (index < MAX - 1) resolve(index + 1);
					else reject(false);
				};
				let requestId;
				try {
					let requestId = REQUEST_IDS_ARRAY[index].request_id;
					if (!isEmpty(requestId)) {
						// find the request
						ShippingRequest.findOne({_id: requestId}, function (findingError, requestFound) {

							if (findingError || isEmpty(requestFound)) {
								sendResponse();
							} else {
								// find the user that sent that request
								User.findOne({_id: requestFound.ruid}, function (fError, uFound) {
									let saveUser = function () {
										uFound.save(function (savingError, uSaved) {
											if (savingError) {
												console.log(`Error while saving user (ID:${uFound._id}) for delete request id (ID:${requestId}) in travel_notice/delete`);
											} else {
												console.log(`Saved successfully for user (ID:${uFound._id}) for delete request id (ID:${requestId}) in travel_notice/delete`);
												let n = new Notification({
													user_id: uSaved._id,
													message: `${USER_OBJECT.f_name} ${USER_OBJECT.l_name} deleted the travel notice you sent for the flight from ${TRAVEL_NOTICE_OBJECT.dep_city} to ${TRAVEL_NOTICE_OBJECT.arr_city} departing on ${dateFlightDeparture}. So, your request has been deleted. Sorry for the inconvenience.`,
													sent: false,
													date_received: helpers.newDate(),
													user_from_id: USER_OBJECT._id,
													action: 32
												});
												n.save();
											}
											sendResponse();
										});
									};

									if (!isEmpty(findingError) || isEmpty(requestFound)) {
										sendResponse();
									} else {
										// remove that request from this user
										if (uFound.requests_ids.length <= 1) {
											sendResponse();
										} else {
											console.log(uFound);
											for (let i = 0; i < uFound.requests_ids.length; i++) {
												if (uFound.requests_ids[i].toString() == requestId.toString()) {
													uFound.requests_ids.splice(i, 1);
													saveUser();
													break;
												} else if (i >= uFound.requests_ids.length - 1) {
													sendResponse();
												}
											}
										}


									}
								});
							}
						});
					} else {
						sendResponse();
					}
				} catch (e) {
					console.log(e);
					sendResponse();
				}
			});
		};

		if (MAX === 0) {
			deleteTravelNoticeInUser();
		} else {
			for (q = 0; q < MAX; q++) {
				deleteUserAtIndex(q).then(function (response) {
					console.log(`not done deleting. Now index ${response}`);
				}, function (error) {
					deleteTravelNoticeInUser();
				});
			}
		}
	};

	let getUser = function () {
		User.findOne({_id: user_id}, function (findingUSRError, userFound) {
			// find the travel notice
			let findTravelNotice = function () {
				TravelNotice.findOne({_id: travel_notice_id}, function (findingTNError, tvlFound) {
					if (findingTNError) {
						callback(500, null, "Internal Server Error", findingTNError);
					} else if (isEmpty(tvlFound)) {
						callback(403, null, "Travel notice doesn't exists", true);
					} else {
						TRAVEL_NOTICE_OBJECT = tvlFound;
						REQUEST_IDS_ARRAY = REQUEST_IDS_ARRAY.concat(TRAVEL_NOTICE_OBJECT.requests_ids);
						let mm = TRAVEL_NOTICE_OBJECT.dep_month < 10 ? `0${TRAVEL_NOTICE_OBJECT.dep_month}` : `${TRAVEL_NOTICE_OBJECT.dep_month}`;
						let dd = TRAVEL_NOTICE_OBJECT.dep_day < 10 ? `0${TRAVEL_NOTICE_OBJECT.dep_day}` : `${TRAVEL_NOTICE_OBJECT.dep_day}`;
						let yyyy = TRAVEL_NOTICE_OBJECT.dep_year;
						dateFlightDeparture = `${mm}/${dd}/${yyyy}`;
						// safely delete the request for each users
						setTimeout(function () {
							deleteRequestIdsForEachUser();
						}, 0);
					}
				});
			};

			/* START */
			if (findingUSRError) {
				callback(500, null, "Internal Server Error", findingUSRError);
			} else if (isEmpty(userFound)) {
				callback(403, null, "User not found, one may not delete a travel notice", true);
			} else {
				USER_OBJECT = userFound;
				// find the travel notice
				setTimeout(function () {
					findTravelNotice();
				}, 0);
			}
		});
	};

	/* START MAIN */

	// check if parameters are empty
	if (isEmpty(travel_notice_id) || isEmpty(user_id)) {
		callback(403, null, {message: "some or all parameters are missing", parameters: parameters}, true);
	} else {
		getUser();
	}
});

/* See all travel notices from the database
 * curl -X GET http://localhost:3000/travel_notice_all
 * */
router.get("/all", function (request, response, next) {
	// callback when result is received
	let callback = helpers.callbackFormatorData(response);

	// returns a list of all the travel notices currently saved in the database
	TravelNotice.find({}, function (error, search) {
		if (error) {
			// do what to do in case of an error
			callback(500, null, "Internal Server Error", error);
		} else {
			// else send the search
			callback(200, search, "Success", false);
		}
	});
});

module.exports = router;

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */