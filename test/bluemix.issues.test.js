/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';

const path = require('path');
const Helper = require('hubot-test-helper');
const helper = new Helper('../src/scripts');
const expect = require('chai').expect;
const mockUtils = require('./mock.utils.cf.js');
const mockESUtils = require('./mock.utils.es.js');
const mockGithubUtils = require('./mock.utils.github.js');

var i18n = new (require('i18n-2'))({
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

// Leverage rewire to gain access to internal functions.
const rewire = require('rewire');

// Passing arrow functions to mocha is discouraged: https://mochajs.org/#arrow-functions
// return promises from mocha tests rather than calling done() - http://tobyho.com/2015/12/16/mocha-with-promises/
describe('Interacting with Github Issue Creation via Reg Ex', function() {

	let room;
	let cf;
	let issuesRewire;

	before(function() {
		mockUtils.setupMockery();
		mockESUtils.setupMockery();
		mockGithubUtils.setupMockery();
		// initialize cf, hubot-test-helper doesn't test Middleware
		cf = require('hubot-cf-convenience');
		issuesRewire = rewire(path.resolve(__dirname, '..', 'src', 'scripts', 'issues'));
		return cf.promise.then();
	});

	beforeEach(function() {
		room = helper.createRoom();
		// Force all emits into a reply.
		room.robot.on('ibmcloud.formatter', function(event) {
			try {
				if (event.message) {
					event.response.reply(event.message);
				}
				else {
					event.response.send({attachments: event.attachments});
				}
			}
			catch (error) {
				console.log(error);
				console.log(JSON.stringify(event));
			}
		});
	});

	afterEach(function() {
		room.destroy();
	});

	context('user calls `issue help`', function() {
		beforeEach(function() {
			return room.user.say('mimiron', '@hubot issue help');
		});

		it('should respond with the help', function() {
			expect(room.messages.length).to.eql(2);
			expect(room.messages[1][1]).to.be.a('string');
			let help = 'hubot issue create against [name]/[repo] when apps crash - ' + i18n.__('help.github.issues.create') + '\n'
				+ 'hubot issue stop creation - ' + i18n.__('help.github.issues.stop') + '\n';
			expect(room.messages[1]).to.eql(['hubot', '@mimiron \n' + help]);
		});
	});

	context('user calls `issues help`', function() {
		beforeEach(function() {
			return room.user.say('mimiron', '@hubot issues help');
		});

		it('should respond with the help', function() {
			expect(room.messages.length).to.eql(2);
			let help = 'hubot issue create against [name]/[repo] when apps crash - ' + i18n.__('help.github.issues.create') + '\n'
				+ 'hubot issue stop creation - ' + i18n.__('help.github.issues.stop') + '\n';
			expect(room.messages[1]).to.eql(['hubot', '@mimiron \n' + help]);
			expect(room.messages[1][1]).to.be.a('string');
		});
	});

	context('user calls `issue stop creation`', function() {
		beforeEach(function() {
			return room.user.say('mimiron', '@hubot issue stop creation');
		});

		it('should respond with the already stopped', function() {
			expect(room.messages.length).to.eql(2);
			expect(room.messages[1]).to.eql(['hubot', '@mimiron ' + i18n.__('github.issues.stop.already')]);
		});
	});

	context('user calls `create an issue`', function() {

		it('should respond with the creating issues on crashes', function() {
			return room.user.say('mimiron', '@hubot issue create against github.com/user/repo when apps crash')
			.then(() => {
				expect(room.messages[1]).to.eql(['hubot', '@mimiron ' + i18n.__('github.issues.will.open.for.crash', 'github.com', 'user')]);
				return room.user.say('mimiron', '@hubot issue stop creation');
			}).then(() => {
				expect(room.messages.length).to.eql(4);
				expect(room.messages[3]).to.eql(['hubot', '@mimiron ' + i18n.__('github.issues.stop.success')]);
			});
		});
	});

	context('test interval event scan', function() {
		it('should run', function() {
			// var fakeBrain = {
			// 	set: function(id, value) {},
			// 	get: function(id){ return undefined; }
			// };
			// room.robot.brain = fakeBrain;
			var user = 'user';
			var repo = 'repo';
			var res = {};
			issuesRewire.__get__('intervalEventScan')(room.robot, res, user, repo);
		});
	});

	context('test processCrashLogs', function() {
		it('should run', function() {
			// var fakeBrain = {
			// 	set: function(id, value) {},
			// 	get: function(id){ return undefined; }
			// };
			// room.robot.brain = fakeBrain;
			var user = 'user';
			var repo = 'repo';
			var res = {
				reply: function(str) {},
				send: function(str) {}
			};
			var resource = {
				entity: {
					actee_name: 'event1ActeeName',
					timestamp: '2016-04-22T19:33:32Z',
					metadata: {
						index: 34,
						reason: 'reason',
						exit_description: 'exit_description',
						exit_status: 'exit_status',
						request: {
							state: 'request_state'
						}
					}
				}
			};
			var result = {};
			issuesRewire.__get__('processRecentCrashLogs')(room.robot, res, user, repo, resource, result);
		});
	});
});
