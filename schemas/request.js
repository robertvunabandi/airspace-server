const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Request = new Schema({
	travel_notice_id: {type: String, required: true}, // id of the user that puts out the travel notice
	ruid: {type: String, required: true}, // id of the user that puts out the travel notice
	sending: {type: Boolean, required: true}, // is this person sending the item being sent
	receiving: {type: Boolean, required: true}, // is this person receiving the item being sent
	status: {type: Number, required: true}, // whether this request has been accepted or not
	// 0: pending, 1: accepted, 2: declined, 3: invalid

	// boolean whether requester is asking these items
	item_envelopes: {type: Boolean, required: false}, 
	item_smbox: {type: Boolean, required: false},
	item_lgbox: {type: Boolean, required: false},
	item_clothing: {type: Boolean, required: false},
	item_fragile: {type: Boolean, required: false},
	item_liquid: {type: Boolean, required: false},
	item_other: {type: Boolean, required: false},
	item_other_name: {type: String, required: false}, // name of other item 
	item_total: {type: Number, required: true},
	//
	recipient: {type: Object, required: true},
	deliverer: {type: Object, required: true},

	drop_off_flexibility: {type: String, required: false}, // flexibility of the user that's putting the travel noting
	pick_up_flexibility: {type: String, required: false} // flexibility of the user that's putting the travel noting

});


module.exports = mongoose.model('Request', Request, "requests");

/*
Mongoose#model(name, [schema], [collection], [skipInit])

name <String, Function> model name or class extending Model
[schema] <Schema>
[collection] <String> name (optional, inferred from model name)
[skipInit] <Boolean> whether to skip initialization (defaults to false)

// const TravelNotice = require('./schemas/travel_notice.js');
*/