const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TravelNotice = new Schema({
	tuid: {type: String, required: true}, // id of the user that puts out the travel notice
	airline: {type: String, required: true}, // ID on the key
	flight_num: {type: Number, required: true}, // ID on the key
	item_types: {type: Array, required: false}, // Types of items from [envelopes, small box, large box, clothing items, and other]

	envelopes: {type: Boolean, required: false},
	smbox: {type: Boolean, required: false},
	lgbox: {type: Boolean, required: false},
	clothing: {type: Boolean, required: false},
	other: {type: Boolean, required: false},

	item_other: {type: String, required: false}, // name of other item 
	drop_off_flexibility: {type: String, required: false}, // flexibility of the user that's putting the travel noting
	pick_up_flexibility: {type: String, required: false}, // flexibility of the user that's putting the travel noting

	// Departure, dep
	dep_iata: {type: String, required: true}, // airport code
	dep_city: {type: String, required: true}, // airport city
	dep_time: {type: String, required: true}, // time of flight, HH:MM
	dep_day: {type: Number, required: true}, // day of flight
	dep_month: {type: Number, required: true}, // month of flight
	dep_year: {type: Number, required: true}, // year of flight
	
	// Arrival: arr
	arr_iata: {type: String, required: true}, // airport code
	arr_city: {type: String, required: true}, // airport city
	arr_time: {type: String, required: true} // time of flight, HH:MM
	arr_day: {type: Number, required: true}, // day of flight
	arr_month: {type: Number, required: true}, // month of flight
	arr_year: {type: Number, required: true}, // year of flight
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