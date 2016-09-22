// Description:
//	 Listens for GitHub events, per subscription done in github.subscribe.js.
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
const TAG = path.basename(__filename);
const GITHUB_ALERT_CONTEXT = 'GITHUB_ALERT_CONTEXT';

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

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
const host = (process.env.VCAP_APP_HOST || 'localhost');
const port = (process.env.PORT || process.env.VCAP_APP_PORT || 8080);

// ------------------------------------------------------------------------------
// Set up the listener
// ------------------------------------------------------------------------------
app.listen(port, host, function() {
	// print a message when the server starts listening
	console.log('\n=================================================='
		+ '\n= Starting at: http://' + host + ':' + port
		+ '\n==================================================');
});

module.exports = function(robot) {

	app.post('/github/webhook', function(req, res) {
		// Close the loop with the sender.
		res.send('OK');
		handleWebhook(robot, req);
	});

	app.get('/', function(req, res) {
		// Close the loop with the sender.
		res.send('OK');
	});

/*
	// --------------------------------------------------------------
	// Listen for webhook events from Github.
	// --------------------------------------------------------------
	robot.router.post('/github/webhook', (req, res) => {
		// Close the loop with the sender.
		res.send('OK');
		handleWebhook(robot, req);
	});
	*/

};

// -------------------------------------------
// Handle a webhook event received from Github.
// -------------------------------------------
function handleWebhook(robot, req) {
	let attachments = [];
	let payload = req.body;
	let eventType = '';
	if (req.headers) {
		eventType = req.headers['x-github-event'];
	}
	robot.logger.info(`${TAG}: Webhook event received: ${eventType}`);

	// Handle push event (commit was made)
	// https://developer.github.com/v3/activity/events/types/#pushevent
	if (eventType === 'push') {
		// There could be >1 commits, so iterate.
		for (let i = 0; i < payload.commits.length; i++) {
			// Parse the message to only include the title, not the description.
			// Both are present separated by 2 newlines.
			let comment = payload.commits[i].message;
			if (comment) {
				let delimitIndex = comment.indexOf('\n\n');
				if (delimitIndex !== -1) {
					// Found delimiter.  Grab just the text before it.
					comment = comment.split('\n\n')[0];
				}
			}
			else {
				comment = i18n.__('github.subscribe.alert.no.comment');
			}

			// Create the alert.
			attachments.push({
				fallback: i18n.__('github.subscribe.alert.code.delivered'),
				title: i18n.__('github.subscribe.alert.code.delivered'),
				title_link: payload.commits[i].url,
				fields: [{
					title: i18n.__('github.subscribe.alert.author'),
					value: payload.commits[i].author.username,
					short: true
				}, {
					title: i18n.__('github.subscribe.alert.repository'),
					value: payload.repository.name,
					short: true
				}, {
					title: i18n.__('github.subscribe.alert.comment'),
					value: comment,
					short: false
				}]
			});
		}
		sendAlert(robot, payload, attachments);
	}

	// Handle a pull request event.
	// https://developer.github.com/v3/activity/events/types/#pullrequestevent
	else if (eventType === 'pull_request' && payload.action === 'opened') {
		// Create the alert.
		attachments.push({
			fallback: i18n.__('github.subscribe.alert.pull.request'),
			title: i18n.__('github.subscribe.alert.pull.request'),
			title_link: payload.pull_request.html_url,
			fields: [{
				title: i18n.__('github.subscribe.alert.originator'),
				value: payload.pull_request.user.login,
				short: true
			}, {
				title: i18n.__('github.subscribe.alert.repository'),
				value: payload.pull_request.base.repo.name,
				short: true
			}, {
				title: i18n.__('github.subscribe.alert.comment'),
				value: payload.pull_request.title,
				short: false
			}]
		});
		sendAlert(robot, payload, attachments);
	}

	// Handle an issue open event
	// https://developer.github.com/v3/activity/events/types/#issuesevent
	else if (eventType === 'issues' && payload.action === 'opened') {
		// Create the alert.
		attachments.push({
			fallback: i18n.__('github.subscribe.alert.issue.opened'),
			title: i18n.__('github.subscribe.alert.issue.opened'),
			title_link: payload.issue.html_url,
			fields: [{
				title: i18n.__('github.subscribe.alert.originator'),
				value: payload.issue.user.login,
				short: true
			}, {
				title: i18n.__('github.subscribe.alert.repository'),
				value: payload.repository.name,
				short: true
			}, {
				title: i18n.__('github.subscribe.alert.comment'),
				value: payload.issue.title,
				short: false
			}]
		});
		sendAlert(robot, payload, attachments);
	}
}

// -------------------------------------------
// Send the alert.
// -------------------------------------------
function sendAlert(robot, payload, attachments) {
	robot.logger.debug(`${TAG}: sendAlert`);
	// Find the res object associated with when the alert was enabled.
	let res = null;
	let githubAlerts = robot.brain.get(GITHUB_ALERT_CONTEXT);
	if (githubAlerts === null) {
		robot.logger.debug(`${TAG}: context not found in robot brain to send alerts.`);
	}
	else {
		for (let i = 0; i < githubAlerts.length; i++) {
			let githubAlert = githubAlerts[i];
			if (githubAlert.repo.startsWith(payload.repository.hooks_url)) {
				robot.logger.debug(`${TAG}: Found alert from brain: ${githubAlert.repo}`);
				res = githubAlert.res;
				// Emit the app status as an attachment
				let alertMessage = { response: res, attachments: attachments };
				robot.logger.debug(`${TAG}: Push event alert: ${JSON.stringify(alertMessage.attachments)}`);
				robot.emit('ibmcloud.formatter', alertMessage);
				break;
			}
		}
	}
};
