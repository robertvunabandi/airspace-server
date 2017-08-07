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

/* POST send or receive request
 * curl -X POST http://localhost:3000/request_send?travel_notice_id=
 * curl -X POST http://localhost:3000/request_send?travel_notice_id=597fa445fb5eaf0011445f98&ruid=597fa392fb5eaf0011445f91&action=0&recipient_name=lol&recipient_email=lol&recipient_phone=2465798&recipient_uses_app=false&deliverer_name=lol&deliverer_email=lol&deliverer_phone=12345678&deliverer_uses_app=true&item_total=5
 * */
router.post("/send", function (request, response, next) {
	/* send or receive request sent to a specific user from query
	 or body, in the DB, this creates a new request. */

	// callback once we get the result
	let callback = helpers.callbackFormatorSrTnUsr(response);

	// populate the new request
	let requestedCount = sf_req_int(request, "item_total", "request_send");
	let action = sf_req_int(request, "action", "request_send");
	// - this tests whether the requester is neither receiving nor sending something
	let SENDRECEIVEBOOLEAN = !(action === 0 || action === 1);
	// - if they are both false, both negations will be true thus making that true
	let itemOther = sf_req_bool(request, "item_other", "request_send");
	// - default to null
	let itemOtherName = itemOther ? sf_req(request, "item_other_name", "request_send") : null;
	// - create variables needed for population
	let recipient_ = {
		name: sf_req(request, "recipient_name", "request_send"),
		email: sf_req(request, "recipient_email", "request_send"),
		phone: sf_req(request, "recipient_phone", "request_send"),
		uses_app: sf_req_bool(request, "recipient_uses_app", "request_send")
	};
	let deliverer_ = {
		name: sf_req(request, "deliverer_name", "request_send"),
		email: sf_req(request, "deliverer_email", "request_send"),
		phone: sf_req(request, "deliverer_phone", "request_send"),
		uses_app: sf_req_bool(request, "deliverer_uses_app", "request_send")
	};
	// a way to check if deliverer or recipient is empty
	let isEmptyDelivererAndRecipient = isEmpty(recipient_.name) || isEmpty(recipient_.email) || isEmpty(recipient_.uses_app);
	isEmptyDelivererAndRecipient = isEmptyDelivererAndRecipient || isEmpty(deliverer_.name) || isEmpty(deliverer_.email) || isEmpty(deliverer_.uses_app);
	// - continue population
	let ruid = sf_req(request, "ruid", "request");
	let newRequest = new ShippingRequest({
		travel_notice_id: sf_req(request, "travel_notice_id", "request_send"),
		ruid: ruid, // we assume the requester exists in DB
		action: action, // is this person sending it
		status: 0,
		recipient: recipient_,
		deliverer: deliverer_,
		item_envelopes: sf_req_bool(request, "item_envelopes", "request_send"),
		item_smbox: sf_req_bool(request, "item_smbox", "request_send"),
		item_lgbox: sf_req_bool(request, "item_lgbox", "request_send"),
		item_clothing: sf_req_bool(request, "item_clothing", "request_send"),
		item_fragile: sf_req_bool(request, "item_fragile", "request_send"),
		item_liquid: sf_req_bool(request, "item_liquid", "request_send"),
		item_other: itemOther,
		item_other_name: itemOtherName,
		item_total: requestedCount,
		drop_off_flexibility: sf_req(request, "drop_off_flexibility", "request_send"),
		pick_up_flexibility: sf_req(request, "pick_up_flexibility", "request_send"),
		date_created: helpers.newDate()
	});

	let sendNotification = function(TVL, SRT, USR) {
		let n = new Notification({
			user_id: TVL.tuid,
			message: `You received a new request from ${USR.f_name} ${USR.l_name}`, // TODO - ADD A USER NAME HERE (FROM XYZ)
			sent: false,
			date_received: helpers.newDate(),
			travel_notice_from_id: TVL._id,
			request_from_id: SRT._id,
			user_from_id: USR._id,
			action: 10
		});
		n.save();
	};

	// we need to have at least 1 item requested so throw an error
	if (requestedCount < 1 || isNaN(requestedCount)) {
		// will throw error if not found in request
		callback(403, null, null, null, `CLIENT ERROR: Requester must request at least 1 item to ship. Was ${requestedCount}`, true);
	} else if (SENDRECEIVEBOOLEAN) {
		// at least one of them must be true
		callback(403, null, null, null, `CLIENT ERROR: Requester must either be sending a package or receiving one. action was ${action}.`, true);
	} else if (isEmptyDelivererAndRecipient) {
		callback(403, null, null, null, `CLIENT ERROR: Deliverer or recipient is not given in parameters. Given ${deliverer_} and ${recipient_}`, true);
	} else {
		TravelNotice.findOne({_id: sf_req(request, "travel_notice_id", "request")}, function (err, tn, next) {
			if (err) {
				callback(500, null, null, null, err, true);
			} else if (tn === null) {
				callback(403, null, null, null, "Requested travel does not exist", true);
			} else {
				// if we found a matching travel notice, we save this request

				// create a function for saving this request to the user's lists of requests
				let save_request_to_user = function (savedRequest, savedTn) {
					// find the user
					User.findOne({_id: ruid}, function (findingUSRError, userFound) {
						if (findingUSRError) {
							callback(500, savedRequest, savedTn, null, "Error in findingUSRError", true);
						} else if (isEmpty(userFound)) {
							// Delete the saved request, this should never happen
							ShippingRequest.remove({_id: savedRequest._id});
							callback(403, null, savedTn, userFound, "User was not found! Wth...", true);
						} else {
							// modify content
							try {
								userFound.requests_ids.push(savedRequest._id);
							} catch (e) {
								userFound.requests_ids = [savedRequest._id];
							}
							userFound.save(function (savingUSRError, userSaved) {
								if (savingUSRError) {
									callback(500, savedRequest, savedTn, userSaved, "Error in savingUSRError", true);
								} else {
									// final callback
									callback(201, savedRequest, savedTn, userSaved, "Saved successfully", false);

									// FINAL SEND NOTIFICATION
									sendNotification(savedTn, savedRequest, userSaved);
								}
							});
						}
					});
					// save the request to him
				};

				// create the function for saving this request to the travel notice
				let save_request_to_tn = function () {
					newRequest.save(function (saving_error, request_saved) {
						// this will throw an error if one of the required variables is not given.
						if (!saving_error) {
							// we add rs_add to the travel notice requests_ids
							let rs_add = {
								user_id: request_saved.ruid,
								request_id: request_saved._id
							};
							try {
								let currentCount = isEmpty(tn.pending_requests_count) || isANumber(tn.pending_requests_count) ? 0 : tn.pending_requests_count;
								// the array be not be initialized so we do a try catch. However, it should be initialized!
								tn.requests_ids.push(rs_add);
								tn.pending_requests_count = 1 + currentCount; // add to the pending request count
								tn.save(function (tnSavingError, newTN) {
									if (tnSavingError) {
										callback(500, null, null, null, "Error in tnSavingError", tnSavingError);
									} else {
										save_request_to_user(request_saved, newTN);
									}
								});

							} catch (err) {
								console.log("ERROR IN tn.requests_ids_push", err);
								let currentCount = isEmpty(tn.pending_requests_count) || isANumber(tn.pending_requests_count) ? 0 : tn.pending_requests_count;
								tn.requests_ids = [];
								tn.requests_ids.push(rs_add);
								tn.pending_requests_count = 1 + currentCount; // add to the pending request count
								tn.save(function (tnSavingError, newTN) {
									if (tnSavingError) {
										callback(500, null, null, null, "Error in tnSavingError", tnSavingError);
									} else {
										save_request_to_user(request_saved, newTN);
									}
								});
							}
						} else {
							console.log(`\n\n\n * * * ** Saving error occured\n\n\n`, saving_error);
							callback(500, null, null, null, saving_error, true);
						}
					});
				};

				// then, first check if this request is already saved
				let requestSent = false;
				if (tn.requests_ids.length > 0) {
					for (let i = 0; i < tn.requests_ids.length; i++) {
						let test_request = tn.requests_ids[i];
						/* here, we're checking if the specific travel_notice being requested contains
						 the user that is sending this request. If that user has not sent a request
						 to this travel notice, then his id cannot appear in this travel notice */
						if (test_request.user_id == sf_req(request, "ruid", "request")) {
							if (test_request.action === 0 || test_request.action === 1) {
								// if the request is either pending or accepted, this request has already been sent
								requestSent = true;
							}
						}
						if (i >= tn.requests_ids.length - 1) {
							if (!requestSent) {
								// if i is the last index and the request has not been sent, save it
								save_request_to_tn();
								// we wait for the last index because of NodeJS's a-synchronousness
							} else {
								callback(403, null, null, null, "Request has already been sent", true);
							}
						} else if (requestSent) {
							// else move to last index to speed it up
							i = tn.requests_ids.length - 2;
						}
					}
				} else {
					save_request_to_tn();
				}
			}
		});
	}
});

/* POST send or receive request, changes status from 0 to 1
 * curl -X POST http://localhost:3000/request/accept?request_id=597fb5cd433879001182b559&traveler_id=597fa34ffb5eaf0011445f90&travel_notice_id=597fa3c2fb5eaf0011445f96
 * */
router.post("/accept", function (request, response, next) {
	// callback once we get the result
	// TODO - Change to ...SrTnUsr(...
	let callback = helpers.callbackFormatorSrTn(response);

	let request_id = sf_req(request, 'request_id', 'request_accept');
	let traveler_id = sf_req(request, 'traveler_id', 'request_accept');
	let travel_notice_id = sf_req(request, 'travel_notice_id', 'request_accept');

	if (isEmpty(request_id) || isEmpty(traveler_id)) {
	}
	// find the specific request
	ShippingRequest.findOne({_id: request_id}, function (findingSRError, shippingRequest) {
		if (findingSRError) {
			callback(500, null, null, "Internal Server Error in findingSRError", findingSRError);
		} else if (isEmpty(shippingRequest)) {
			callback(404, null, null, "Request not found", false);
		} else {
			shippingRequest.status = 1; // change status to 1
			// confirm that the user has this travelnotice by checking that the id of the request is in the travel notice
			TravelNotice.findOne({_id: travel_notice_id}, function (findingTVLError, travelNotice) {
				if (findingTVLError) {
					callback(500, null, null, "Internal Server Error in findingTVLError", findingTVLError);
				} else if (isEmpty(shippingRequest)) {
					callback(403, null, null, "Travel notice not found", false);
				} else {
					// fix the pending and accepted count
					let fixPendingAndAcceptedCount = function (savedReq) {
						let currentPendingCount = isEmpty(travelNotice.pending_requests_count) || isANumber(travelNotice.pending_requests_count) ? 0 : travelNotice.pending_requests_count;
						let currentAcceptedCount = isEmpty(travelNotice.accepted_requests_count) || isANumber(travelNotice.accepted_requests_count) ? 0 : travelNotice.accepted_requests_count;
						// this being less than 0 would never happen but you never know...
						travelNotice.pending_requests_count = currentPendingCount - 1 < 0 ? 0 : currentPendingCount - 1;
						travelNotice.accepted_requests_count = currentAcceptedCount + 1;
						travelNotice.save(function (savingError, savedTn) {
							if (savingError) {
								callback(500, savedReq, travelNotice, "Error while updating the travel notice. Travel notice was found however.", savingError);
							} else {
								sendNotification(shippingRequest.ruid, savedTn._id, savedReq._id, savedTn.tuid);
								callback(201, savedReq, savedTn, "Request accepted", false);
							}
						});
					};

					// check if request_id is in this travel notice
					for (let i = 0; i < travelNotice.requests_ids.length; i++) {
						let test_request_id = travelNotice.requests_ids[i].request_id;
						console.log(`${test_request_id} ${request_id} ${test_request_id == request_id}`);
						if (test_request_id == request_id) {
							// save the request if we find it
							shippingRequest.save(function (savingError, savedRequest) {
								if (savingError) {
									callback(500, null, travelNotice, "Error while saving the request. Travel notice was found however", savingError);
								} else {
									fixPendingAndAcceptedCount(savedRequest);
								}
							});
							break;
						} else if (i >= travelNotice.requests_ids.length - 1) {
							callback(403, null, null, "Request not found in Travel notice", true);
						}
					}
				}
			});
		}
	});

	let sendNotification = function(user_id, tnid, rqid, usrfromid) {
		User.findOne({_id: usrfromid}, function(findingError, userFound){
			if (findingError) {} else if (isEmpty(userFound)) {} else {
				let n = new Notification({
					user_id: user_id,
					message: `Your request to ${userFound.f_name} ${userFound.l_name} has been accepted. Congratulations :)`, // TODO - Add a to user name (TO XYZ)
					sent: false,
					date_received: helpers.newDate(),
					travel_notice_from_id: tnid,
					request_from_id: rqid,
					user_from_id: usrfromid,
					action: 11
				});
				n.save();
			}
		});
	};
});

/* POST send or receive request, changes status from 0 to 2
 * curl -X POST http://localhost:3000/request_decline
 *
 * */
router.post("/decline", function (request, response, next) {
	// callback once we get the result
	// TODO - Change to ...SrTnUsr(...
	let callback = helpers.callbackFormatorSrTn(response);

	let request_id = sf_req(request, 'request_id', 'request_accept');
	let traveler_id = sf_req(request, 'traveler_id', 'request_accept');
	let travel_notice_id = sf_req(request, 'travel_notice_id', 'request_accept');

	if (isEmpty(request_id) || isEmpty(traveler_id) || isEmpty(travel_notice_id)) {
		callback(403, null, null, `Some or all of the parameters given are empty. `, true);
	}
	// find the specific request
	ShippingRequest.findOne({_id: request_id}, function (findingSRError, shippingRequest) {
		if (findingSRError) {
			callback(500, null, null, "Internal Server Error in findingSRError", findingSRError);
		} else if (isEmpty(shippingRequest)) {
			callback(404, null, null, "Request not found", false);
		} else {
			shippingRequest.status = 2; // status
			// confirm that the user has this travelnotice by checking that the id of the request is in the travel notice
			TravelNotice.findOne({_id: travel_notice_id}, function (findingTVLError, travelNotice) {
				if (findingTVLError) {
					callback(500, null, null, "Internal Server Error in findingTVLError", findingTVLError);
				} else if (isEmpty(shippingRequest)) {
					callback(403, null, null, "Travel notice not found", false);
				} else {
					// fix the pending and accepted count
					let fixPendingAndAcceptedCount = function (savedReq) {
						// update the pending count then save the travel notice
						let currentPendingCount = isEmpty(travelNotice.pending_requests_count) || isANumber(travelNotice.pending_requests_count) ? 0 : travelNotice.pending_requests_count;
						travelNotice.pending_requests_count = currentPendingCount - 1 < 0 ? 0 : currentPendingCount - 1;
						travelNotice.save(function (savingError, savedTn) {
							if (savingError) {
								callback(500, savedReq, travelNotice, "Error while updating the travel notice. Travel notice was found however.", savingError);
							} else {
								// get the user via the id of the requester and send a notification
								sendNotification(shippingRequest.ruid, savedTn._id, savedReq._id, savedTn.tuid);
								callback(201, savedReq, savedTn, "Request declined", false); // **SUCCESS-CALL**
							}
						});
					};

					// check if request_id is in this travel notice
					for (let i = 0; i < travelNotice.requests_ids.length; i++) {
						let test_request = travelNotice.requests_ids[i];
						if (test_request.request_id == request_id) {
							// save the request if we find it
							shippingRequest.save(function (savingError, savedRequest) {
								if (savingError) {
									callback(500, null, travelNotice, "Error while saving the request. Travel notice was found however", savingError);
								} else {
									fixPendingAndAcceptedCount(savedRequest);
								}
							});
							break;
						}
						if (i >= travelNotice.requests_ids.length - 1) {
							callback(403, null, null, "Request not found in Travel notice", true);
						}
					}
				}
			});
		}
	});

	let sendNotification = function(user_id, tnid, rqid, usrfromid) {
		User.findOne({_id: usrfromid}, function(findingError, userFound){
			if (findingError) {} else if (isEmpty(userFound)) {} else {
				let n = new Notification({
					user_id: user_id,
					message: `Your request to ${userFound.f_name} ${userFound.l_name} has been declined. We apologize :(`, // TODO - Add a to user name (TO XYZ)
					sent: false,
					date_received: helpers.newDate(),
					travel_notice_from_id: tnid,
					request_from_id: rqid,
					user_from_id: usrfromid,
					action: 12
				});
				n.save();
			}
		});
	};
});

/* GET
 * curl -X GET http://localhost:3000/request/get_from_travel_notice?travel_notice_id=597fa445fb5eaf0011445f98
 * */
router.get("/get_from_travel_notice", function (request, response, next) {
	// callback for responding to send to user
	let callback = helpers.callbackFormatorSrTnUsr(response);

	// get required parameters
	let travel_notice_id = sf_req(request, "travel_notice_id", "request_get_from_travel_notice");

	// send the results
	let sendResults = function (SRs, TN, USR) {
		// sends the results by first checking if the result is empty, if it is, send a 404, otherwise send it
		if (SRs.length <= 0) {
			callback(404, SRs, TN, USR, "No request found matching the given travel notice id", false);
		} else {
			callback(200, SRs, TN, USR, "Results found!", false);
		}
	};

	// find the requests for this travel notice
	let findAllRequestsForTn = function (foundTravelNotice, foundUser) {
		// assumes foundTravelNotice is not empty
		ShippingRequest.find({}, function (findingError, foundSRs) {
			if (findingError) {
				callback(500, null, foundTravelNotice, foundUser, "Internal Server Error", findingError);
			} else if (isEmpty(foundSRs)) {
				callback(404, null, foundTravelNotice, foundUser, "No request found in the database at all", false);
			} else {
				// rule out the requests that are bad
				let RES = [];
				for (let i = 0; i < foundSRs.length; i++) {
					if (foundSRs[i].travel_notice_id == foundTravelNotice._id) {
						// if the request at index i's travel_notice_id equals the foundTN's id, we add it to RES
						RES.push(foundSRs[i]);
						if (i >= foundSRs.length - 1) {
							sendResults(RES, foundTravelNotice, foundUser);
						}
					} else if (i >= foundSRs.length - 1) {
						sendResults(RES, foundTravelNotice, foundUser);
					}
				}
			}
		});
	};

	let findUserAssociated = function(foundTravelNotice) {
		User.findOne({_id: foundTravelNotice.tuid}, function (findingError, foundUser) {
			if (findingError) {
				callback(500, null, foundTravelNotice, null, "Internal Server Error", findingError);
			} else if (isEmpty(foundUser)) {
				callback(403, null, foundTravelNotice, null, "No user found associated with the travel notice", false);
			} else {
				// findAllRequests
				findAllRequestsForTn(foundTravelNotice, foundUser);
			}
		});

	};

	// find the travel notice
	let findTravelNotice = function () {
		TravelNotice.findOne({_id: travel_notice_id}, function (findingError, foundTN) {
			if (findingError) {
				callback(500, null, null, null, "Internal Server Error", findingError);
			} else if (isEmpty(foundTN)) {
				callback(403, null, null, null, "No travel notice found matches the given travel notice id", false);
			} else {
				// find the user
				findUserAssociated(foundTN);
			}
		});
	};

	if (isEmpty(travel_notice_id)) {
		callback(403, null, null, "The travel notice id parameter was not given", true);
	} else {
		findTravelNotice();
	}
});

/* GET one users wants to see all the requests that he has sent
 * curl -X GET http://localhost:3000/request/get_my?uid=597fa3a3fb5eaf0011445f93
 * */
router.get("/get_my", function (request, response, next) {

	// callback for responding to send to user
	let callback = helpers.callbackFormatorData(response);

	// set the uid of the user that is asking to see his requests
	let uid = sf_req(request, "uid", "request_get_my");

	// find all requests and rule out those that are bad
	ShippingRequest.find({ruid: uid}, function (findingError, requests) {
		if (findingError) {
			callback(500, null, "Internal Server Error at findingError", findingError);
		} else if (isEmpty(requests)) {
			callback(404, null, "No requests found", true);
		} else {
			// send result if requests is not empty
			sendResult(requests);
		}
	});

	// send a 404 if the array is empty, otherwise send it
	let sendResult = function (arrayList) {
		if (isEmptyArray(arrayList)) {
			callback(404, null, "You have not sent a request yet.", false);
		} else {
			callback(200, arrayList, "Success", false);
		}
	};
});

/* GET one users wants to see all the requests that people sent to him
 * curl -X GET http://localhost:3000/request/get_to_me?uid=5977a6ca44f8d217b87f7819
 *
 * curl -X GET http://localhost:3000/request/get_to_me?uid=597fa3a3fb5eaf0011445f93
 * */
router.get("/get_to_me", function (request, response, next) {

	// callback for responding to send to user
	let callback = helpers.callbackFormatorData(response);

	// initialize the list of requests to be sent to an empty list
	let requestIDList = [];

	function removeEmptyBracket(requestArray) {
		// trying to get rid of the empty brackets
		let res = [];
		for (let i = 0; i < requestArray.length; i++) {
			if (requestArray[i] !== "[]") {
				res.push(requestArray[i]);
			}
		}
		return res;
	}

	// set the uid of the user that is asking to see his requests
	let uid = sf_req(request, "uid", "request_get_to_me");

	// find all requests and rule out those that are bad
	User.findOne({_id: uid}, function (findingError, userFound) {
		if (findingError) {
			callback(500, null, "Internal Server Error at findingError", findingError);
		} else if (isEmpty(userFound) || userFound === null) {
			callback(404, null, "User is not found", true);
		} else {
			// loop through each travel notice and get all the requestsids that are associated with it
			if (userFound.travel_notices_ids.length === 0) {
				// if this uses made no travel notice, there
				callback(404, null, "No travel notice ever created by user", true);
			} else {
				// TODO - Fix this for loop because some error happen
				for (let i = 0; i < userFound.travel_notices_ids.length; i++) {
					TravelNotice.findOne({_id: userFound.travel_notices_ids[i]}, function (findingErrorTN, travelNoticeFound) {
						if (findingErrorTN) {
							// server error, we should continue because it's minor ish
							if (i >= userFound.travel_notices_ids.length - 1) {
								// if we're at the end we make the final callback
								if (requestIDList.length === 0) {
									callback(404, requestIDList, "list is empty, minor error happened at findingErrorTN", false);
								} else {
									callback(200, removeEmptyBracket(requestIDList), "success, but minor error happened at findingErrorTN", false);
								}
							}
						} else if (isEmpty(travelNoticeFound)) {
							if (i >= userFound.travel_notices_ids.length - 1) {
								// if we're at the end we make the final callback
								if (requestIDList.length === 0) {
									callback(404, requestIDList, "list is empty, travel notices were empty", false);
								} else {
									callback(200, removeEmptyBracket(requestIDList), "success, but travel notices were empty", false);
								}
							}
						} else {
							// if we find that request id, then we concatenate it into the list
							if (travelNoticeFound.requests_ids.length > 0) {
								requestIDList = requestIDList.concat(travelNoticeFound.requests_ids);
								if (i >= userFound.travel_notices_ids.length - 1) {
									// if we're at the end we make the final callback
									if (requestIDList.length === 0) {
										callback(404, requestIDList, "list is empty", false);
									} else {
										callback(200, removeEmptyBracket(requestIDList), "success", false);
									}
								}
							} else if (i >= userFound.travel_notices_ids.length - 1) {
								// if we're at the end we make the final callback
								if (requestIDList.length === 0) {
									callback(404, requestIDList, "list is empty", false);
								} else {
									callback(200, removeEmptyBracket(requestIDList), "success", false);
								}
							}
						}
					});
				}
			}
		}
	});
});

/* GET one users wants to see all the requests that people sent to him
 * curl -X GET http://localhost:3000/request/get?request_id=5980f067a82ead00112a0b57
 * */
router.get("/get", function (request, response, next) {
	// callback for responding to send to user
	let callback = helpers.callbackFormatorSrTnUsr(response);

	// set the uid of the user that is asking to see his requests
	let request_id = sf_req(request, "request_id", "request_get");

	// function to find the user
	let findUser = function (reqSend, tnSend) {
		User.findOne({_id: tnSend.tuid}, function (findingError, userFound) {
			if (findingError) {
				callback(500, reqSend, tnSend, null, "Internal Server error", findingError);
			} else if (isEmpty(userFound)) {
				callback(403, reqSend, tnSend, null, "Request and Travel notice were found but no user attached found", true);
			} else {
				callback(200, reqSend, tnSend, userFound, "Found Request and Travel Notice", false);
			}
		});

	};

	// function to find travel notice once request is found
	let findTravelNotice = function (requestToSend) {
		TravelNotice.findOne({_id: requestToSend.travel_notice_id}, function (findingError, tnFound) {
			if (findingError) {
				callback(500, requestToSend, null, null, "Internal Server error", findingError);
			} else if (isEmpty(tnFound)) {
				callback(403, requestToSend, null, null, "Request was found but no travel notice attached found", true);
			} else {
				findUser(requestToSend, tnFound);
			}
		});
	};

	ShippingRequest.findOne({_id: request_id}, function (findingError, requestFound) {
		if (findingError) {
			callback(500, null, null, null, "Internal Server error.", findingError);
		} else if (isEmpty(requestFound)) {
			callback(403, null, null, null, "Request not found", true);
		} else {
			// if we find the request, we need to look for the travel notice attached to it
			findTravelNotice(requestFound);

		}
	});
});

/* POST deletes a request and removes it from both user and travel notice
 * curl -X POST http://localhost:3000/request/delete?request_id=5980bf2562e9a00011e059d6&uid=5980bf0162e9a00011e059d5
 * */

router.post("/delete", function (request, response, next) {
	// callback once we get the result
	let callback = helpers.callbackFormatorSrTnUsr(response);

	// TODO - This doesn't remove the request from the user object
	// get the request
	let user_id = sf_req(request, "uid", "request_delete");
	let request_id = sf_req(request, "request_id", "request_delete");

	// success object to be sent at the end
	let successObjectMessage = {
		user: {success: false},
		travel_notice: {success: false},
		shipping_request: {success: false}
	};

	let findUserAndEdit = function () {
		User.findOne({_id: user_id}, function (findingError, foundUser) {
			if (findingError) {
				// we don't move forward if we don't find the user
				callback(500, null, null, null, "Internal Server Error", findingError);
			} else if (isEmpty(foundUser)) {
				// we don't move forward if we don't find the user
				successObjectMessage.user = {success: false, message: "user was not found"};
				callback(404, null, null, null, {message: successObjectMessage}, true);
			} else {
				let saveUser = function () {
					foundUser.save(function (savingError, savedUser) {
						if (savingError) {
							callback(500, null, null, null, "Error occurred while saving the user", savingError);
						} else {
							// Find the shipping request once the user is saved
							findShippingRequest(savedUser);
						}
					});
				};
				// modify the requests ids to delete this request, modify the success object in them eantime
				for (let i = 0; i < foundUser.requests_ids.length; i++) {
					if (foundUser.requests_ids[i] == request_id) {
						foundUser.requests_ids.splice(i, 1);
						successObjectMessage.user = {success: true};
						saveUser();
						break;
					}
					if (i >= foundUser.requests_ids.length - 1) {
						successObjectMessage.user = {
							success: false,
							message: "user did not have the shipping request id"
						};
						saveUser();
					}
				}
			}
		});
	};

	// find the shipping request
	let findShippingRequest = function (userFoundSaved) {
		// first find the shipping request
		ShippingRequest.findOne({_id: request_id}, function (findingError, foundSR) {
			// delete the shipping request
			let deleteShippingRequest = function (TN) {
				ShippingRequest.remove({_id: foundSR._id}, function (deletionError) {
					if (deletionError) {
						// send a 500 call in case this error happens, they could try it again
						successObjectMessage.shipping_request = {
							success: false,
							message: "deletion error occurred",
							error: deletionError
						};
						callback(500, foundSR, TN, userFoundSaved, successObjectMessage, true);
					} else {
						// success message to send that deletion went through
						successObjectMessage.shipping_request = {
							success: true,
							message: "request should be deleted from server"
						};
						callback(200, foundSR, TN, userFoundSaved, successObjectMessage, false);
					}
				});
			};

			// find the travel notice, remove the request from the travel notice
			let findTravelNoticeAndEdit = function () {
				TravelNotice.findOne({_id: foundSR.travel_notice_id}, function (findingError, foundTN) {
					if (findingError) {
						successObjectMessage.travel_notice = {success: false, error: true, message: findingError};
						deleteShippingRequest(null);
					} else if (isEmpty(foundTN)) {
						successObjectMessage.travel_notice = {success: false, message: "Travel notice was not found"};
						deleteShippingRequest(foundTN);
					} else {
						let saveTravel = function () {
							if (foundSR.action === 0) {
								// if pending
								let currentCount = isEmpty(foundTN.pending_requests_count) || isANumber(foundTN.pending_requests_count) ? 0 : foundTN.pending_requests_count;
								foundTN.pending_requests_count = currentCount - 1 < 0 ? 0 : currentCount - 1;
							} else if (foundSR.action === 1) {
								// if accepted
								let currentCount = isEmpty(foundTN.accepted_requests_count) || isANumber(foundTN.accepted_requests_count) ? 0 : foundTN.accepted_requests_count;
								foundTN.accepted_requests_count = currentCount - 1 < 0 ? 0 : currentCount - 1;
							}

							foundTN.save(function (savingError, savedTn) {
								if (savingError) {
									successObjectMessage.travel_notice = {
										success: false,
										message: "saving error occurred",
										error: savingError
									};
									// move to final step
									deleteShippingRequest(foundTN);
								} else {
									// move to final step
									deleteShippingRequest(savedTn);
								}
							});
						};

						// remove this request in the travel notice and then save
						for (let i = 0; i < foundTN.requests_ids.length; i++) {
							if (foundTN.requests_ids[i].request_id == request_id) {
								foundTN.requests_ids.splice(i, 1);
								successObjectMessage.travel_notice = {success: true};
								saveTravel();
								break;
							}
							if (i >= foundTN.requests_ids.length - 1) {
								successObjectMessage.travel_notice = {
									success: false,
									message: "travel notice did not have the shipping request id"
								};
								saveTravel();
							}
						}
					}
				});
			};

			if (findingError) {
				// send error, we can't keep going if this error occurs
				callback(500, null, null, null, "Internal Server Error inside of findShippingRequest", findingError);
			} else if (isEmpty(foundSR)) {
				// send error, we can't keep going if this error occurs
				successObjectMessage.shipping_request = {success: false, message: "request was not found"};
				callback(404, null, null, null, successObjectMessage, true);
			} else {
				findTravelNoticeAndEdit();
			}
		});
	};

	/* actual process gets executed here!!! */
	let parameters = {
		user_id: "" + user_id,
		shipping_request_id: "" + request_id
	};

	if (isEmpty(request_id) || isEmpty(user_id)) {
		// make sure all parameters are given
		callback(403, null, null, {message: "Request id was not specified", parameters: parameters}, true);
	} else {
		// find the user, remove the request from the user object
		findUserAndEdit();
	}
});

module.exports = router;

// FROM /SEND ENDPOINT
/* let callback = function (status_, request_, travel_notice_, message_, error_) {
 // callback for responding to send to user
 response.setHeader('Content-Type', 'application/json');
 response.status(status_);
 let server_response;
 if (error_) {
 server_response = {success: false, request: null, travel_notice: null, message: message_, error: error_};
 } else if (request_ === null) {
 // if we get to here that means travel_notice_ is not empty
 server_response = {success: false, request: null, travel_notice: null, message: message_, error: false};
 } else {
 server_response = {
 success: true,
 request: request_,
 travel_notice: travel_notice_,
 message: message_,
 error: false
 };
 }
 response.send(JSON.stringify(server_response));
 }; */

// FROM /DECLINE ENDPOINT
/* let callback = function (status_, request_, travel_notice_, message_, error_) {
 response.setHeader('Content-Type', 'application/json');
 response.status(status_);
 let server_response;
 if (error_) {
 server_response = {success: false, request: null, travel_notice: null, message: message_, error: error_};
 } else if (request_ === null) {
 // if we get to here that means travel_notice_ is not empty
 server_response = {success: false, request: null, travel_notice: null, message: message_, error: false};
 } else {
 server_response = {
 success: true,
 request: request_,
 travel_notice: travel_notice_,
 message: message_,
 error: false
 };
 }
 response.send(JSON.stringify(server_response));
 }; */

// FROM ACCEPT ENDPOINT
/*let callback = function (status_, request_, travel_notice_, message_, error_) {
 // callback for responding to send to user
 response.setHeader('Content-Type', 'application/json');
 response.status(status_);
 let server_response;
 if (error_) {
 server_response = {success: false, request: null, travel_notice: null, message: message_, error: error_};
 } else if (request_ === null) {
 // if we get to here that means travel_notice_ is not empty
 server_response = {success: false, request: null, travel_notice: null, message: message_, error: false};
 } else {
 server_response = {
 success: true,
 request: request_,
 travel_notice: travel_notice_,
 message: message_,
 error: false
 };
 }
 response.send(JSON.stringify(server_response));
 }; */