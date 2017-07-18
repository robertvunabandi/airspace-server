const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TravelNotice = new Schema({
	tuid: {type: String, required: true}, // id of the user that puts out the travel notice
	airline: {type: String, required: true}, // ID on the key
	flight_num: {type: Number, required: true}, // ID on the key

	item_envelopes: {type: Boolean, required: false},
	item_smbox: {type: Boolean, required: false},
	item_lgbox: {type: Boolean, required: false},
	item_clothing: {type: Boolean, required: false},
	item_other: {type: Boolean, required: false},

	drop_off_flexibility: {type: String, required: false}, // flexibility of the user that's putting the travel noting
	pick_up_flexibility: {type: String, required: false}, // flexibility of the user that's putting the travel noting

	// Departure, dep
	dep_iata: {type: String, required: true}, // airport code
	dep_city: {type: String, required: true}, // airport city
	dep_min: {type: Number, required: true}, // minute of flight
	dep_hour: {type: Number, required: true}, // hour of flight
	dep_day: {type: Number, required: true}, // day of flight
	dep_month: {type: Number, required: true}, // month of flight
	dep_year: {type: Number, required: true}, // year of flight
	
	// Arrival: arr
	arr_iata: {type: String, required: true}, // airport code
	arr_city: {type: String, required: true}, // airport city
	arr_min: {type: Number, required: true}, // minute of flight
	arr_hour: {type: Number, required: true}, // hour of flight
	arr_day: {type: Number, required: true}, // day of flight
	arr_month: {type: Number, required: true}, // month of flight
	arr_year: {type: Number, required: true}, // year of flight

	requests_ids: {type: Array, required: false}
});


module.exports = mongoose.model('TravelNotice', TravelNotice, "travel_notices");

/*
Mongoose#model(name, [schema], [collection], [skipInit])

name <String, Function> model name or class extending Model
[schema] <Schema>
[collection] <String> name (optional, inferred from model name)
[skipInit] <Boolean> whether to skip initialization (defaults to false)

// const TravelNotice = require('./schemas/travel_notice.js');
*/