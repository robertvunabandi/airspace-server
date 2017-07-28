/**
 * Created by celestin on 7/21/17.
 */


let helpers = {
	fromMStoDate: function (ms) {
		// returns an array, [dd, mm, yyyy, hour, min, second] in integer values in military time,
		let d = new Date(ms);
		// MONTH IS ONE INDEX LOWER, SO 0 IS JANUARY
		return [d.getUTCDate() - 1, d.getUTCMonth(), d.getUTCFullYear(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()];
	},
	newDate: function(){
		let monthStrings = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
		let d = new Date(Date.now());
		d.setTime(d.getTime() + d.getTimezoneOffset()*60*1000);
		return {
			day: d.getUTCDate() - 1,
			month: d.getUTCMonth(),
			year: d.getUTCFullYear(),
			hour: d.getUTCHours(),
			min: d.getUTCMinutes(),
			sec: d.getUTCSeconds(),
			simple: `${d.getUTCMonth()+1}/${d.getUTCDate() - 1}/${d.getUTCFullYear()}`,
			verbose: `${monthStrings[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
		};
	}
};

module.exports = helpers;