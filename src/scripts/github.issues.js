// Description:
//	Listens for commands to list the spaces in the org
//
// Configuration:
//	 HUBOT_BLUEMIX_API Bluemix API URL
//	 HUBOT_BLUEMIX_ORG Bluemix Organization
//	 HUBOT_BLUEMIX_SPACE Bluemix space
//	 HUBOT_BLUEMIX_USER Bluemix User ID
//	 HUBOT_BLUEMIX_PASSWORD Password for the Bluemix User
//	 HUBOT_GITHUB_DOMAIN The domain for the github repo (defaults to github.com)
//	 HUBOT_GITHUB_TOKEN the github access token that will be used for creating issues
//
// Author:
//	nsandona
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

const _ = require('lodash');
const dateformat = require('dateformat');
const cf = require('hubot-cf-convenience');
const gh = require('../lib/github');
const activity = require('hubot-ibmcloud-activity-emitter');

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
	let intervalTracker;

	robot.on('github.issues.stop', (res) => {
		robot.logger.debug(`${TAG}: github.issues.stop Natural Language match.`);
		stopIssueCreation(res);
	});

	robot.respond(/github\sissue\s+stop\s+creation/i, {id: 'github.issues.stop'}, res => {
		robot.logger.debug(`${TAG}: github.issues.stop Reg Ex match.`);
		stopIssueCreation(res);
	});

	function stopIssueCreation(res) {
		robot.logger.debug(`${TAG}: github.issues.stop res.message.text=${res.message.text}.`);
		if (typeof intervalTracker !== 'undefined') {
			let message = i18n.__('github.issues.stop.success');
			robot.emit('ibmcloud.formatter', { response: res, message: message});
			clearInterval(intervalTracker);
			robot.logger.info(`${TAG}: github issue creation has been stopped.`);
		}
		else {
			robot.logger.info(`${TAG}: github issue creation has already been stopped.`);
			let message = i18n.__('github.issues.stop.already');
			robot.emit('ibmcloud.formatter', { response: res, message: message});
		}
	};

	robot.on('github.issues.open', (res, parameters) => {
		robot.logger.debug(`${TAG}: github.issues.open Natural Language match.`);
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
			startIssueCreation(res, user, repo);
		}
	});

	robot.respond(/github\sissue\s+(create|open)\s+(against|in|on) ([^/]+)\/([\w-_]+).*crash(es|ed)?/i, {id: 'github.issues.open'}, res => {
		robot.logger.debug(`${TAG}: github.issues.open Reg Ex match.`);
		const user = res.match[3];
		const repo = res.match[4];
		startIssueCreation(res, user, repo);
	});

	function startIssueCreation(res, user, repo) {
		robot.logger.debug(`${TAG}: github.issues.open res.message.text=${res.message.text}.`);
		let since = robot.brain.get('last.event.scan');
		if (!since) {
			since = new Date();
			robot.brain.set('last.event.scan', since);
		}
		let message = i18n.__('github.issues.will.open.for.crash', user, repo);
		robot.emit('ibmcloud.formatter', { response: res, message: message});
		robot.logger.info(`${TAG}: Watching for crashes and will open issues against ${user}/${repo}.`);

		intervalTracker = setInterval(intervalEventScan, 30000, robot, res, user, repo);
	}

};


function intervalEventScan(robot, res, user, repo) {
	let lastScan = robot.brain.get('last.event.scan');

	if (!lastScan) {
		lastScan = new Date(new Date().getTime() - 30000);
	}

	robot.brain.set('last.event.scan', new Date());
	robot.logger.info(`${TAG}: Asynch call using cf library to check for new crash events...`);
	cf.Events.getEvents({q: `timestamp>${lastScan.toISOString()};type:app.crash`}).then(result => {
		if (result.resources && result.resources.length > 0) {
			robot.logger.info(`${TAG}: Found ${result.resources.length} events since ${lastScan.toISOString()}`);
		}
		result.resources.forEach(resource => {
			robot.logger.info(`${TAG}: Asynch call using cf library to check for logs on app ${resource.entity.actee}...`);
			cf.Logs.getRecent(resource.entity.actee).then(result => {
				robot.logger.info(`${TAG}: cf library returned with log results.`);
				processRecentCrashLogs(robot, res, user, repo, resource, result);
			})
			.catch((err) => {
				robot.logger.error(`${TAG}: error - ${err}`);
			});
		});
	});
};

function processRecentCrashLogs(robot, res, user, repo, resource, result) {
	let logOutput;
	if (_.isArray(result) && result.length > 0) {
		logOutput = result.reduce((logs, message) => logs + `${logs ? '\n' : ''}${dateformat(message.timestamp, 'dd mmm HH:MM:ss Z', true)} [${message.source_name}/${message.source_id}]\t${message.message_type === 1 ? 'OUT' : 'ERR'} ${message.message}`, '');
	}
	else {
		logOutput = '';
	}
	const title = `${resource.entity.actee_name} Crashed`;

	robot.logger.info(`${TAG}: Asynch call using github library to check for an existing issue on ${user}/${repo}...`);
	let existingIssue;
	// Pull back existing issues to see if we can just append a new comment
	gh.issues.repoIssues({
		user,
		repo,
		filter: 'all',
		state: 'open',
		sort: 'updated'
	}, (err, issues) => {
		if (!err) {
			issues.some(issue => {
				if (issue.title === title) {
					existingIssue = issue;
					return true;
				}
			});
			const payload = {
				user,
				repo,
				title,
				body: `\`${resource.entity.actee_name}\` crashed at **${resource.entity.timestamp}**
				## Metadata
				\`\`\`
				${JSON.stringify(resource.entity.metadata, 2)}
				\`\`\`
				## Recent Logs
				\`\`\`
				${logOutput}
				\`\`\``
			};
			if (existingIssue) {
				payload.number = existingIssue.number;
				robot.logger.info(`${TAG}: Existing issue ${payload.number} on ${user}/${repo} found.`);
			}
			else {
				payload.labels = [];
			}

			robot.logger.info(`${TAG}: Asynch call using github library to create or update an issue on ${user}/${repo}...`);
			// Conditionally create a comment if the issue exists or create a new one
			gh.issues[existingIssue ? 'createComment' : 'create'](payload, (err, issue) => {
				if (err) {
					robot.logger.error(err);
				}
				else {
					robot.logger.info(`${TAG}: Registered issue #${issue.number || existingIssue.number}`);
					let message = i18n.__('github.issues.crash.detected', resource.entity.actee_name, issue.html_url);
					robot.emit('ibmcloud.formatter', { response: res, message: message});
					activity.emitBotActivity(robot, res, { activity_id: 'activity.git.issue', app_name: resource.entity.actee_name, app_guid: resource.entity.actee});
				}
			});
		}
		else {
			robot.logger.error(`${TAG}: error - ${err}`);
		}
	});
};
