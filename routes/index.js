//entire link: https://mysterious-headland-54722.herokuapp.com/

var express = require('express');
var router = express.Router();

var testResponse = {
	numbers: [0,1,2,3,4,5,6],
	names: ["Ruben", "Amanda", "Robert"]
};

/* GET Travelers */
router.get('/travelers', function(request, response, next) {
	//Returns a list of travelers from the search query
});

/* GET test */
router.get('/test', function(request, response, next) {
	response.setHeader('Content-Type', 'application/json');
	response.send(JSON.stringify(testResponse), null, 3);
});

module.exports = router;

/*

Heroku pushes:

git add <files>
git commit -m "messages"
git push origin master

git push heroku master # seems like he pushes from github

To run locally:
heroku local
# if we do web, it does what's in web

*/