const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TravelNotice = new Schema({
	tuid: {type: String, required: true}, // id of the user that puts out the travel notice
	airline_iata: {type: String, required: true}, // ID on the key
	airline_name: {type: String, required: true}, // airline name
	flight_num: {type: Number, required: true}, // ID on the key
	item_envelopes: {type: Boolean, required: true},
	item_smbox: {type: Boolean, required: true},
	item_lgbox: {type: Boolean, required: true},
	item_clothing: {type: Boolean, required: true},
	item_fragile: {type: Boolean, required: true},
	item_liquid: {type: Boolean, required: true},
	item_other: {type: Boolean, required: true},
	drop_off_flexibility: {type: String, required: false}, // flexibility of the user that's putting the travel noting
	pick_up_flexibility: {type: String, required: false}, // flexibility of the user that's putting the travel noting

	// Departure, dep
	dep_airport_name: {type: String, required: true}, // departure airport name
	dep_iata: {type: String, required: true}, // airport code
	dep_city: {type: String, required: true}, // airport city
	dep_min: {type: Number, required: true}, // minute of flight
	dep_hour: {type: Number, required: true}, // hour of flight
	dep_day: {type: Number, required: true}, // day of flight
	dep_month: {type: Number, required: true}, // month of flight
	dep_year: {type: Number, required: true}, // year of flight
	// Arrival: arr
	arr_airport_name: {type: String, required: true}, // arrival airport name
	arr_iata: {type: String, required: true}, // airport code
	arr_city: {type: String, required: true}, // airport city
	arr_min: {type: Number, required: true}, // minute of flight
	arr_hour: {type: Number, required: true}, // hour of flight
	arr_day: {type: Number, required: true}, // day of flight
	arr_month: {type: Number, required: true}, // month of flight
	arr_year: {type: Number, required: true}, // year of flight

	requests_ids: {type: Array, required: false},
	pending_requests_count: {type: Number, required: true},
	accepted_requests_count: {type: Number, required: true}
});


module.exports = mongoose.model('TravelNotice', TravelNotice, "travel_notices");

/*
Mongoose#model(name, [schema], [collection], [skipInit])

name <String, Function> model name or class extending Model
[schema] <Schema>
[collection] <String> name (optional, inferred from model name)
[skipInit] <Boolean> whether to skip initialization (defaults to false)

// const TravelNotice = require('./schemas/travel_notices_route.js');
*/