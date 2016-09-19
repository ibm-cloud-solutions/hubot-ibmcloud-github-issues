// Description:
//	Lists the help for the GitHub commands.
//
// Configuration:
//	 HUBOT_BLUEMIX_API Bluemix API URL
//	 HUBOT_BLUEMIX_ORG Bluemix Organization
//	 HUBOT_BLUEMIX_SPACE Bluemix space
//	 HUBOT_BLUEMIX_USER Bluemix User ID
//	 HUBOT_BLUEMIX_PASSWORD Password for the Bluemix User
//
// Commands:
//   hubot github help - Show available commands in the github category.
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

const APP_HELP = /github+(|s)\s+help/i;

module.exports = (robot) => {

	// Natural Language match
	robot.on('github.help', (res, parameters) => {
		robot.logger.debug(`${TAG}: Natural Language match. res.message.text=${res.message.text}.`);
		help(robot, res);
	});

	// RegEx match
	robot.respond(APP_HELP, { id: 'github.help' }, function(res) {
		robot.logger.debug(`${TAG}: RegEx match. res.message.text=${res.message.text}.`);
		help(robot, res);
	});

	// Common code.
	function help(robot, res) {
		robot.logger.debug(`${TAG}: github.help res.message.text=${res.message.text}.`);
		let help = robot.name + ' github issue create against [name]/[repo] when apps crash - ' + i18n.__('help.github.issues.create') + '\n';
		help += robot.name + ' github issue stop creation - ' + i18n.__('help.github.issues.stop') + '\n';
		help += robot.name + ' github subscribe [user]/[repo] - ' + i18n.__('help.github.subscribe') + '\n';
		help += robot.name + ' github unsubscribe [user]/[repo] - ' + i18n.__('help.github.unsubscribe') + '\n';
		robot.emit('ibmcloud.formatter', { response: res, message: '\n' + help});
	};
};
