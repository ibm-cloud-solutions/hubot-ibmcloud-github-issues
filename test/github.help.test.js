/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';

const Helper = require('hubot-test-helper');
const helper = new Helper('../src/scripts');
const expect = require('chai').expect;
const mockUtils = require('./mock.utils.cf.js');
const mockESUtils = require('./mock.utils.es.js');
const mockGithubUtils = require('./mock.utils.github.js');
const portend = require('portend');

const i18n = new (require('i18n-2'))({
	locales: ['en'],
	extension: '.json',
	// Add more languages to the list of locales when the files are created.
	directory: __dirname + '/../src/messages',
	defaultLocale: 'en',
	// Prevent messages file from being overwritten in error conditions (like poor JSON).
	updateFiles: false
});
// At some point we need to toggle this setting based on some user input.
i18n.setLocale('en');

// Passing arrow functions to mocha is discouraged: https://mochajs.org/#arrow-functions
// return promises from mocha tests rather than calling done() - http://tobyho.com/2015/12/16/mocha-with-promises/
describe('Interacting with Github Help via Reg Ex', function() {

	let cf;
	let room;
	let help = '\nhubot github issue create against [name]/[repo] when apps crash - ' + i18n.__('help.github.issues.create') + '\n';
	help += 'hubot github issue stop creation - ' + i18n.__('help.github.issues.stop') + '\n';
	help += 'hubot github subscribe [user]/[repo] - ' + i18n.__('help.github.subscribe') + '\n';
	help += 'hubot github unsubscribe [user]/[repo] - ' + i18n.__('help.github.unsubscribe') + '\n';

	before(function() {
		mockUtils.setupMockery();
		mockESUtils.setupMockery();
		mockGithubUtils.setupMockery();
		// initialize cf, hubot-test-helper doesn't test Middleware
		cf = require('hubot-cf-convenience');
		return cf.promise.then();
	});

	beforeEach(function() {
		room = helper.createRoom();
	});

	afterEach(function() {
		room.destroy();
	});

	context('user calls `github help`', function() {
		it('should respond with the help', function() {
			room.user.say('mimiron', '@hubot github help');
			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(help);
			});
		});
	});

	context('user asks for github help with NLC`', function() {
		it('should respond with the help', function() {
			let portendCalled = portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(help);
			});
			const res = { message: {text: 'Please help me with issue creation on app crash', user: {id: 'anId'}}, response: room };
			room.robot.emit('github.help', res, {});
			return portendCalled;
		});
	});

});
