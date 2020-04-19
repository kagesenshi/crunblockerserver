// ==== DECLARATIONS ==== //
const express = require('express');
const request = require('request');
const helmet = require('helmet');

const app = express();

const knownVersions = ['1.0', '1.1', '2313.8'];


// ==== FUNCTIONS ==== //
/**
 * Set the options for querying CR
 * @param  {Response} query Query from the url
 * @return {Object}     Options for the query to CR
 */
function setOptions(query) {
	let options = {
		url: 'http://api-manga.crunchyroll.com/cr_start_session',
		qs: {
			api_ver: '1.0', // eslint-disable-line
			access_token: 'FLpcfZH4CbW4muO', // eslint-disable-line
			device_type: 'com.crunchyroll.manga.android', // eslint-disable-line
			device_id: generateId() // eslint-disable-line
		}
	};
	if (query.auth) {
		options.qs.auth = query.auth;
	}
	return options;
}

/**
 * Generate a random 32 character long device ID
 * @return {String} Generated device ID
 */
function generateId() {
	let id = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (var i = 0; i < 32; i++) {
		id += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return id;
}

/**
 * Emit a negative reply containing an error message
 * @param  {Object} res  Reply object
 * @param  {String} err Error message
 */
function replyError(res, err) {
	res.status(500).send({
		message: err,
		code: 'error',
		error: true
	});
}

/**
 * Emit a positive reply containing data
 * @param  {Object} res  Reply object
 * @param  {Object} data Object containing the requested payload
 */
function replySuccess(res, data) {
	res.status(200).send(data);
}

// ==== ROUTING ==== //
// support for reverse proxy
app.enable('trust proxy');
app.disable('view cache');
// use the middleware
app.use(helmet());
app.use(helmet.noCache());
app.get('/start_session', (req, res) => {
	// default version if none specified: 1.0
	let version = req.query.version;
	if (version === undefined) {
		version = '1.0';
	}
	// validate version against whitelist
	if (knownVersions.indexOf(version) === -1) {
		replyError(res, 'Invalid API version specified.');
		return;
	}
	// parse version into object containing minor and major version
	let split = version.split('.');
	version = { major: parseInt(split[0]) || 0, minor: parseInt(split[1]) || 0 };

	if (version.major === 1) {
		let options = setOptions(req.query);
		request(options, (error, response, body) => {
			try {
				let data = JSON.parse(body);
				replySuccess(res, data);
			} catch (e) {
				replyError(res, 'There was an error with the response from the crunchyroll server');
				console.log(`Error in parsing the response: ${e}`);
			}
		}).on('error', error => {
			console.log(`Error fetching ${options.url}: ${error}`);
			replyError(res, error);
		});
	} else {
		let options = setOptions(req.query);
		request(options, (error, response, body) => {
			try {
				let data = JSON.parse(body);
				replySuccess(res, data);

			} catch (e) {
				replyError(res, 'There was an error with the response from the crunchyroll server');
				console.log(`Error in parsing the response: ${e}`);
			}
		}).on('error', error => {
			console.log(`Error fetching ${options.url}: ${error}`);
			replyError(res, error);
		});
    }
});
app.get('*', (req, res) => {
	replyError(res, 'Invalid API endpoint.');
});

// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 3001; // eslint-disable-line
/* app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});*/

module.exports = app;
