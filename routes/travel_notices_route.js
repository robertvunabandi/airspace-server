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
		accepted_requests_count: 0
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

	let findUser = function(TN) {
		User.findOne({_id: TN.tuid}, function(findingError, foundUser) {
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
 * curl -X POST http://localhost:3000/travel_notice_delete
 * curl -X POST http://localhost:3000/travel_notice_delete?tuid=5967d57baf06e6606c442961&travel_notice_uid=<PLACE HERE>
 * */
router.post("/delete", function (request, response, next) {

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

	// remove the travel notice
	let travel_notice_id = sf_req(request, "travel_notice_id", "travel_notice_delete");
	let user_id = sf_req(request, "user_id", "travel_notice_delete");
	// put all in parameters
	let parameters = {travel_notice_id: ""+travel_notice_id, user_id: ""+user_id};

	/* CHECKING CONDITIONS, SOME FXNs MAY BE INSIDE OTHERS */
	// check if parameters are empty
	if (isEmpty(travel_notice_id) || isEmpty(user_id)) {
		callback(403, null, {message:"some or all parameters are missing", parameters:parameters}, true);
	} else {
		getUser();
	}

	let deleteTravelNotice = function() {
		// removes the travel notice, make sure this is done only if the travel notice actually exists
		TravelNotice.remove({_id:travel_notice_id}, function(deletionError, results){
			// TODO - Do something here, maybe log it??
		});
	};

	// get user to confirm that user exists, don't move forward if not
	let getUser = function(){
		User.findOne({_id:user_id}, function(findingUSRError, userFound) {
			if (findingUSRError) {
				callback(500, null, "Internal Server Error", findingUSRError);
			} else if (isEmpty(userFound)) {
				callback(403, null, "User not found, one may not delete a travel notice", true);
			} else {
				let saveUser = function() {
					userFound.save(function(savingError, userSaved) {
						// empty function here, if needed will change
					});
				};
				let getTravelNotice = function(indexRemoveInUser) {
					TravelNotice.findOne({_id: travel_notice_id}, function (findingTNError, foundTN) {
						if (findingTNError) {
							callback(500, null, "Internal Server Error", findingTNError);
						} else if (isEmpty(foundTN)) {
							callback(403, null, "Travel notice not found, may not be deleted if it doesn't exist", true);
							// remove the travel notice inside of the user and then save
							userFound.travel_notices_ids.splice(indexRemoveInUser, 1);
							saveUser();
						} else {
							// remove the travel notice inside of the user and then save
							userFound.travel_notices_ids.splice(indexRemoveInUser, 1);
							saveUser();
							/* ACTIONS, SOME FXNs MAY BE INSIDE OTHERS */
							let requestIdsToRemove = [];
							// remove each request one by one, add the ids to the array
							let removeRequests = function(boolAction) {
								if (boolAction) {
									callback(201, foundTN, "Travel notice should be deleted, but there may be errors", false);
									// delete each requests indivually
									deleleRequests(requestIdsToRemove, foundTN, userFound);
								} else {
									// here it's good, we already remove it from the user, and now we just need
									// to remove the travel notice itself
									callback(201, foundTN, "Travel notice should be deleted", false);
									deleteTravelNotice();
								}
							};
							let findRequests = function(){
								requestIdsToRemove = requestIdsToRemove.concat(foundTN.requests_ids);
								// if the length is greater than 0, then we remove each one one by one which is GOOD!
								removeRequests(requestIdsToRemove.length > 0);
							};
						}
					});
				};
				// inside of user, check if this travel notice exist, don't move forward if not
				let findTnIdInUser = function() {
					for (let i = 0; i < userFound.travel_notices_ids.length; i++) {
						if (userFound.travel_notices_ids[i] == travel_notice_id) {
							// get travel notice if we find the id inside of the travel notices
							getTravelNotice(i);
							break;
						} else if (i >= userFound.travel_notices_ids.length - 1) {
							callback(403, null, "Travel notice not created by user", true);
						}
					}
				};

				// get the travel notice, don't move forward if travel notice does not exist
				findTnIdInUser();
			}
		});
	};

	// get all the users and for each user, remove the requests given inside of requestIdsToRemove
	let deleleRequests = function(requestIdArray, foundTn, foundUSR) {
		// - Get the date
		let mm = foundTn.dep_month < 10 ? `0${foundTn.dep_month}` : `${foundTn.dep_month}`;
		let dd = foundTn.dep_day < 10 ? `0${foundTn.dep_day}` : `${foundTn.dep_day}`;
		let yyyy = foundTn.dep_year;
		let dateFlightDeparture = `${mm}/${dd}/${yyyy}`;
		let requestArraySuccess = [];
		// initialize this array as empty everywhere
		for (let j = 0; j < requestIdArray.length; j++) {
			requestArraySuccess.push(null);
		}
		// start the deletion
		for (let i = 0; i < requestIdArray.length; i++) {
			let conclude = function() {
				if (i >= requestIdArray.length - 1) {
					console.log("====================================");
					console.log("=Last=Call=To=travel_notice_delete==");
					console.log("* * * * * * * * * * * * * * * * * * ");
					console.log(requestArraySuccess);
					console.log("* * * * * * * * * * * * * * * * * * ");
					console.log(request.uri);
					console.log("* * * * * * * * * * * * * * * * * * ");
					console.log("====================================");
					// delete request
					deleteTravelNotice();
					// send notification
					// - create the notification
					let n = new Notification({
						user_id: user_id,
						message: `You have successfully deleted your travel notice from ${foundTn.dep_city} to ${foundTn.arr_city} departing on ${dateFlightDeparture}`,
						sent: false,
						date_received: helpers.newDate(),
						action: 30
					});
					// - send the notification
					n.save();
				};
			};
			// this list is made of objects {user_id: <Obj>, request_id: <Obj>}
			let srId = requestIdArray[i].request_id;
			// find the request
			ShippingRequest.findOne({_id:srId}, function(findingSRError, srFound) {
				// if (err) {} else if (isEmpty()) {} else {}
				if (findingSRError) {
					// if an error occurs, we do nothing
					requestArraySuccess[i] = {success:false, error:"findingSRError"};
					conclude();
				} else if (isEmpty(srFound)) {
					// if we don't find it, we do nothing
					requestArraySuccess[i] = {success:false, error:"Request not found"};
					conclude();
				} else {
					// if we find it, we do stuffs
					let deleteRequest = function(){
						ShippingRequest.remove({_id:srFound._id}, function(deletionError) {
							if (deletionError) {
								requestArraySuccess[i].error += " + deletionError";
							} else {
								requestArraySuccess[i].error += " - request should be deleted";
							}

							// then send a notification
							let n = new Notification({
								user_id: srFound.ruid,
								message: `${foundUSR.f_name} ${foundUSR.l_name} deleted the request you sent for the flight from ${foundTn.dep_city} to ${foundTn.arr_city} departing on ${dateFlightDeparture}`, // TODO - ADD A USER NAME HERE (FROM XYZ)
								sent: false,
								date_received: helpers.newDate(),
								user_from_id: foundTn.tuid,
								action: 32
							});
							n.save();
							conclude();
						});
					};
					// find the user associated with it
					User.findOne({_id:srFound.ruid}, function(findingUSRError, userFound) {
						if (findingUSRError) {
							requestArraySuccess[i] = {success:false, error:"findingUSRError"};
							deleteRequest();
						} else if (isEmpty(userFound)) {
							requestArraySuccess[i] = {success:false, error:"User not found"};
							deleteRequest();
						} else {
							// TODO - Check, one of either user or tn has an object instead of a request string in request ids
							// delete request in user
							for (let k = 0; k < userFound.requests_ids.length; k++) {
								if (userFound.requests_ids[i] == srId) {
									userFound.requests_ids.splice(i, 1);
									userFound.save(function(savingError) {
										// then delete request
										if (savingError) {
											requestArraySuccess[i] = {success:false, error:"User saving error"};
											deleteRequest();
										} else {
											requestArraySuccess[i] = {success:true, error:""};
											deleteRequest();
										}
									});
									break;
								} else if (k >= userFound.requests_ids.length - 1) {
									// then delete request
									requestArraySuccess[i] = {success:true, error:"User doesn't have request"};
									deleteRequest();
								}
							}

						}
					});
				}
			});
		}
	};
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