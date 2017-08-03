const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = new Schema({
	// suitcase ints: Black, White, Red, Purple, Blue, Green, Yellow, Orange, Grey, Rainbow
	// User id's is automatically generated
	f_name: {type: String, required: true},
	l_name: {type: String, required: true},
	email: {type: String, required: true},
	dob: {type: String, required: false}, // MM-DD-YYYY, String
	location: {type: String, required: false}, // default: the best place on earth
	favorite_travel_place: {type: String, required: false}, // default: wherever has the cheapest flight
	suitcase_color_integer: {type: String, required: false}, // default: rainbow
	phone: {type: String, required: false},
	travel_notices_ids: {type:Array, required: false},
	requests_ids: {type:Array, required: false},
	chat_collections: {type:Array, required: false}, // EXTRA TO FIX FOR BUGS
	trips_taken: {type:Number, required: true},
	dollars_made: {type:Number, required: true},
	items_sent: {type:Number, required: true},
	date_created: {type:Object, required: true},
});

module.exports = mongoose.model('User', User, "users");

/*
Mongoose#model(name, [schema], [collection], [skipInit])

name <String, Function> model name or class extending Model
[schema] <Schema>
[collection] <String> name (optional, inferred from model name)
[skipInit] <Boolean> whether to skip initialization (defaults to false)

// const User = require('./schemas/user.js');
*/