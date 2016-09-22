// Description:
//	 Enables user to monitor events for a GitHub repository.
//
// Configuration:
//	 HUBOT_GITHUB_DOMAIN The domain for the github repo (defaults to github.com)
//	 HUBOT_GITHUB_TOKEN the github access token that will be used for creating issues
//
// Author:
//	lanzen
//
/*
* Licensed Materials - Property of IBM
* (C) Copyright IBM Corp. 2016. All Rights Reserved.
* US Government Users Restricted Rights - Use, duplication or
* disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
*/
'use strict';

const path = require('path');
const request = require('request');
const TAG = path.basename(__filename);

const GITHUB_ALERT_CONTEXT = 'GITHUB_ALERT_CONTEXT';
const webhookHost = process.env.VCAP_APP_HOST || process.env.IP || 'localhost';
const webhookPort = process.env.VCAP_APP_PORT || process.env.PORT || 3000;
const webhookUrl = 'http://' + webhookHost + ':' + webhookPort + '/github/webhook';
console.log(`${TAG}: webhookUrl: ${webhookUrl}`);
const githubHost = process.env.HUBOT_GITHUB_DOMAIN || 'api.github.com';

// --------------------------------------------------------------
// i18n (internationalization)
// It will read from a peer messages.json file.  Later, these
// messages can be referenced throughout the module.
// --------------------------------------------------------------
const i18n = new (require('i18n-2'))({
	locales: ['en'],
	extension: '.json',
	// Add more languages to the list of locales when the files are created.
	directory: __dirname + '/../messages',
	defaultLocale: 'en',
	// Prevent messages file from being overwritten in error conditions (like poor JSON).
	updateFiles: false
});
// At some point we need to toggle this setting based on some user input.
i18n.setLocale('en');

module.exports = function(robot) {

	// -------------------------------------------
	// Subscribe - Natural language match.
	// -------------------------------------------
	robot.on('github.subscribe', (res, parameters) => {
		robot.logger.debug(`${TAG}: github.subscribe Natural Language match.`);
		let user = null;
		let repo = null;
		if (parameters && parameters.user) {
			user = parameters.user;
		}
		else {
			robot.logger.error(`${TAG}: Error extracting Username from text=[${res.message.text}].`);
			let message = i18n.__('cognitive.parse.problem.user');
			robot.emit('ibmcloud.formatter', { response: res, message: message});
		}
		if (parameters && parameters.repo) {
			repo = parameters.repo;
		}
		else {
			robot.logger.error(`${TAG}: Error extracting Repository Name from text=[${res.message.text}].`);
			let message = i18n.__('cognitive.parse.problem.repo');
			robot.emit('ibmcloud.formatter', { response: res, message: message});
		}
		if (user && repo) {
			createWebHook(robot, res, user, repo);
		}
	});

	// -------------------------------------------
	// Subscribe - Command match.
	// -------------------------------------------
	robot.respond(/github\s+subscribe\s+([^/]+)\/([\w-_]+)/i, {id: 'github.subscribe'}, res => {
		robot.logger.debug(`${TAG}: github.subscribe Reg Ex match.`);
		let user = res.match[1];
		let repo = res.match[2];

		// Get a list of all the webhooks defined in the repo.
		getWebhookList(robot, res, user, repo, function(webhookArray) {
			robot.logger.debug(`${TAG}: list of webhooks:`);
			robot.logger.debug(webhookArray);
			// If the response is null, there was an error.
			if (!webhookArray) {
				let message = i18n.__('github.subscribe.error.fetching.webhooks', user, repo);
				robot.emit('ibmcloud.formatter', { response: res, message: message});
			}
			// If none exist, there are no problems and we can move forward.
			else if (webhookArray.length === 0) {
				robot.logger.debug(`${TAG}: No webhooks found.  Create one.`);
				createWebHook(robot, res, user, repo);
			}
			// Webhookds exist, so search for our match.
			else if (webhookArray.length >= 1) {
				let webhookUrl = `http://${webhookHost}:${webhookPort}/github/webhook`;
				let foundWebhook = false;
				for (let i = 0; i < webhookArray.length; i++) {
					let webhook = webhookArray[i];
					if (webhook.config.url === webhookUrl) {
						// Found a match.  Let the user know its already present.
						robot.logger.debug(`${TAG}: Found existing webhook.  Create one.`);
						foundWebhook = true;
						let message = i18n.__('github.subscribe.already.exists', user, repo);
						robot.emit('ibmcloud.formatter', { response: res, message: message});
					}
				}
				// Webhooks existed, but weren't created by this bot.  Create one.
				if (!foundWebhook) {
					robot.logger.debug(`${TAG}: Webhooks found, but not ours.  Create one.`);
					createWebHook(robot, res, user, repo);
				}
			}
		});
	});

	// -------------------------------------------
	// Unsubscribe - Natural language match.
	// -------------------------------------------
	robot.on('github.unsubscribe', (res, parameters) => {
		robot.logger.debug(`${TAG}: github.unsubscribe Natural Language match.`);
		let user = null;
		let repo = null;
		if (parameters && parameters.user) {
			user = parameters.user;
		}
		else {
			robot.logger.error(`${TAG}: Error extracting Username from text=[${res.message.text}].`);
			let message = i18n.__('cognitive.parse.problem.user');
			robot.emit('ibmcloud.formatter', { response: res, message: message});
		}
		if (parameters && parameters.repo) {
			repo = parameters.repo;
		}
		else {
			robot.logger.error(`${TAG}: Error extracting Repository Name from text=[${res.message.text}].`);
			let message = i18n.__('cognitive.parse.problem.repo');
			robot.emit('ibmcloud.formatter', { response: res, message: message});
		}
		if (user && repo) {
			unsubscribe(robot, res, user, repo);
		}
	});

	// -------------------------------------------
	// Unsubscribe - Command match.
	// -------------------------------------------
	robot.respond(/github\s+unsubscribe\s+([^/]+)\/([\w-_]+)/i, {id: 'github.unsubscribe'}, res => {
		robot.logger.debug(`${TAG}: github.unsubscribe Reg Ex match.`);
		let user = res.match[1];
		let repo = res.match[2];
		unsubscribe(robot, res, user, repo);
	});

	// -------------------------------------------
	// Unsubscribe - Common code where the real work is done.
	// -------------------------------------------
	function unsubscribe(robot, res, user, repo) {
		robot.logger.info(`${TAG}: Unsubscribe user=${user}, repo=${repo}.`);
		// Get a list of all the webhooks defined in the repo.
		getWebhookList(robot, res, user, repo, function(webhookArray) {
			robot.logger.debug(`${TAG}: list of webhooks:`);
			robot.logger.debug(webhookArray);
			// If the response is null, there was an error.
			if (!webhookArray) {
				let message = i18n.__('github.subscribe.error.fetching.webhooks', user, repo);
				robot.emit('ibmcloud.formatter', { response: res, message: message});
			}
			// If none exist, let the user know.
			else if (webhookArray.length === 0){
				let message = i18n.__('github.subscribe.no.webhooks', user, repo);
				robot.emit('ibmcloud.formatter', { response: res, message: message});
			}
			// Webhookds exist, so search for our match.
			else if (webhookArray.length === 1) {
				let webhookUrl = `http://${webhookHost}:${webhookPort}/github/webhook`;
				let foundWebhook = false;
				for (let i = 0; i < webhookArray.length; i++) {
					let webhook = webhookArray[i];
					if (webhook.config.url === webhookUrl) {
						// Found it.
						deleteWebhook(robot, res, webhookArray[0].url);
						foundWebhook = true;
					}
				}
				// Webhooks existed, but weren't created by this bot.
				if (!foundWebhook) {
					let message = i18n.__('github.subscribe.no.webhooks', user, repo);
					robot.emit('ibmcloud.formatter', { response: res, message: message});
				}
			}
		});
	}
};

// -------------------------------------------
// Get a list of all webhooks in Github
// Return it as a JSON array.
// -------------------------------------------
function getWebhookList(robot, res, user, repo, callback) {
	robot.logger.info(`${TAG}: getWebhookList for user: ${user}, repo: ${repo}`);
	// Create the options for the HTTP request.
	let options = {
		method: 'GET',
		url: `https://${githubHost}/repos/${user}/${repo}/hooks`,
		headers: {
			Authorization: `token ${process.env.HUBOT_GITHUB_TOKEN}`,
			'User-Agent': 'request'
		}
	};

	// Fetch the list of webhooks from Github.
	request(options, function(error, response, body) {
		if (response.statusCode === 200) {
			// Success.
			robot.logger.info(`${TAG}: Got list of webhooks: ${body}`);
			callback(JSON.parse(body));
		}
		else {
			// Didn't get the expected repsonse.
			robot.logger.info(`${TAG}: Failed to get webhook list.  Return code: ${response.statusCode}`);
			robot.logger.info(`${TAG}: Error: ${error}`);
			callback(null);
		}
	});
}

// -------------------------------------------
// Delete a Github webhook
// -------------------------------------------
function deleteWebhook(robot, res, url) {
	robot.logger.info(`${TAG}: deleteWebhook for url: ${url}`);

	// Create the options for the HTTP request.
	let options = {
		method: 'DELETE',
		url: url,
		headers: {
			Authorization: `token ${process.env.HUBOT_GITHUB_TOKEN}`,
			'User-Agent': 'request'
		}
	};

	// Delete the webhook from Github.
	request(options, function(error, response, body) {
		console.log(JSON.stringify(response));
		if (response.statusCode === 204) {
			// Success.
			robot.logger.info(`${TAG}: Success deleting subscription: ${url}`);
			let message = i18n.__('github.subscribe.delete.success');
			robot.emit('ibmcloud.formatter', { response: res, message: message});
			// Clean up the reference in the robot brain.
			let githubAlerts = robot.brain.get(GITHUB_ALERT_CONTEXT);
			if (githubAlerts !== null) {
				for (let i = 0; i < githubAlerts.length; i++) {
					let alert = githubAlerts[i];
					if (alert.repo === url) {
						githubAlerts.splice(i, 1);
						break;
					}
				}
			}
		}
		else {
			// Didn't get the expected repsonse.
			robot.logger.info(`${TAG}: Failed to unsubscribe.  Return code: ${response.statusCode}`);
			robot.logger.info(`${TAG}: Error: ${error}`);
			let message = i18n.__('github.subscribe.delete.failure', 'Github responded with response code: ' + response.statusCode);
			robot.emit('ibmcloud.formatter', { response: res, message: message});
		}
	});
}

// -------------------------------------------
// Create a webhook in github.
// -------------------------------------------
function createWebHook(robot, res, user, repo) {
	robot.logger.info(`${TAG}: Create web hook user=${user}, repo=${repo}.`);
	let url = `https://${githubHost}/repos/${user}/${repo}/hooks`;

	// Create the body for the POST request.
	let body = {
		name: 'web',
		active: true,
		events: ['issues', 'pull_request', 'push'],
		config: {
			url: webhookUrl,
			content_type: 'json'
		}
	};

	// Create the options for the HTTP POST.
	let options = {
		method: 'POST',
		url: url,
		headers: {
			Authorization: `token ${process.env.HUBOT_GITHUB_TOKEN}`,
			'User-Agent': 'request'
		},
		form: JSON.stringify(body)
	};

	// Send the request to Github to create the webhook.
	request(options, function(error, response, body) {
		if (response.statusCode === 201) {
			// Success.
			robot.logger.info(`${TAG}: Success creating subscription: ${url}`);
			robot.logger.debug(`${TAG}: Response to create webhook: ${body}`);
			let message = i18n.__('github.subscribe.create.success');
			robot.emit('ibmcloud.formatter', { response: res, message: message});
			// Store the res object for future use when alerts come in, so they can
			// be sent to the same location where the alert was enabled.
			let githubAlerts = robot.brain.get(GITHUB_ALERT_CONTEXT);
			if (githubAlerts === null) {
				githubAlerts = [];
				robot.brain.set(GITHUB_ALERT_CONTEXT, githubAlerts);
			}
			body = JSON.parse(body);
			robot.logger.debug(`${TAG}: Adding record to the brain for future alerts, repo: ${body.url}`);
			githubAlerts.push({ res: res, repo: body.url});
		}
		else {
			// Didn't get the expected repsonse.
			robot.logger.info(`${TAG}: Failed to subscribe.  Return code: ${response.statusCode}`);
			robot.logger.info(`${TAG}: Error: ${error}`);
			let message = i18n.__('github.subscribe.create.failure', 'Github responded with response code: ' + response.statusCode);
			robot.emit('ibmcloud.formatter', { response: res, message: message});
		}
	});
};
