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

	// --------------------------------------------------------------
	// Listen for webhook events from Github.
	// --------------------------------------------------------------
	robot.router.post('/github/webhook', (req, res) => {
		// Close the loop with the sender.
		res.send('OK');
		handleWebhook(robot, req, res);
	});

};

// -------------------------------------------
// Handle a webhook event received from Github.
// -------------------------------------------
function handleWebhook(robot, req, res) {
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
			// Create the alert.
			attachments.push({
				fallback: i18n.__('github.subscribe.alert.code.delivered'),
				title: i18n.__('github.subscribe.alert.code.delivered'),
				fields: [{
					title: i18n.__('github.subscribe.alert.author'),
					value: payload.commits[i].committer,
					short: true
				}, {
					title: i18n.__('github.subscribe.alert.message'),
					value: payload.commits[i].message,
					short: true
				}, {
					title: i18n.__('github.subscribe.alert.url'),
					value: payload.commits[i].url,
					short: true
				}]
			});
		}
		// Emit the app status as an attachment
		robot.emit('ibmcloud.formatter', { response: res, attachments });
	}

	// Handle a pull request event.
	// https://developer.github.com/v3/activity/events/types/#pullrequestevent
	else if (eventType === 'pull_request' && payload.action === 'opened') {
		// Create the alert.
		attachments.push({
			fallback: i18n.__('github.subscribe.alert.pull.request'),
			title: i18n.__('github.subscribe.alert.pull.request'),
			fields: [{
				title: i18n.__('github.subscribe.alert.title'),
				value: payload.pull_request.title,
				short: true
			}, {
				title: i18n.__('github.subscribe.alert.repository'),
				value: payload.pull_request.base.repo.full_name,
				short: true
			}, {
				title: i18n.__('github.subscribe.alert.originator'),
				value: payload.pull_request.user.login,
				short: true
			}, {
				title: i18n.__('github.subscribe.alert.url'),
				value: payload.pull_request._links.self,
				short: true
			}]
		});
		// Emit the app status as an attachment
		robot.emit('ibmcloud.formatter', { response: res, attachments });
	}

	// Handle an issue open event
	// https://developer.github.com/v3/activity/events/types/#issuesevent
	else if (eventType === 'issue' && payload.action === 'opened') {
		// Create the alert.
		attachments.push({
			fallback: i18n.__('github.subscribe.alert.issue.opened'),
			title: i18n.__('github.subscribe.alert.issue.opened'),
			fields: [{
				title: i18n.__('github.subscribe.alert.title'),
				value: payload.issue.title,
				short: true
			}, {
				title: i18n.__('github.subscribe.alert.description'),
				value: payload.issue.body,
				short: true
			}, {
				title: i18n.__('github.subscribe.alert.url'),
				value: payload.issue.url,
				short: true
			}]
		});
		// Emit the app status as an attachment
		robot.emit('ibmcloud.formatter', { response: res, attachments });
	}
}
