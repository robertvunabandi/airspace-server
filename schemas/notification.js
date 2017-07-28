/**
 * Created by celestin on 7/28/17.
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


let Notification = new Schema({
	user_id: {type: String, required: true}, // id of the user that this notification belongs to
	message: {type: String, required: true},
	sent: {type: Boolean, required: true},
	date_received: {type: Object, required: true},
	travel_notice_from_id: {type: String, required: false},
	request_from_id: {type: String, required: false},
	user_from_id: {type: String, required: false},
	message_from_id: {type: String, required: false},
	action: {type: Number, required: true}
});

module.exports = mongoose.model('Notification', Notification, `notifications`); // creates a Message model, with the concatenation of collections

/*
 Mongoose#model(name, [schema], [collection], [skipInit])

 name <String, Function> model name or class extending Model
 [schema] <Schema>
 [collection] <String> name (optional, inferred from model name)
 [skipInit] <Boolean> whether to skip initialization (defaults to false)

 // const Message = require('./schemas/message.js');
 */