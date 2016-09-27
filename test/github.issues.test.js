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
const portend = require('portend');
const rewire = require('rewire');

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
describe('Interacting with Github Issues via Reg Ex', function() {

	let room;
	let cf;
	let issuesRewire;

	before(function() {
		mockUtils.setupMockery();
		mockESUtils.setupMockery();
		mockGithubUtils.setupMockery();
		// initialize cf, hubot-test-helper doesn't test Middleware
		cf = require('hubot-cf-convenience');
		issuesRewire = rewire(path.resolve(__dirname, '..', 'src', 'scripts', 'github.issues'));
		return cf.promise.then();
	});

	beforeEach(function() {
		room = helper.createRoom();
	});

	afterEach(function() {
		room.destroy();
	});

	context('user calls `github issue stop creation`', function() {
		it('should respond with the already stopped', function() {
			room.user.say('mimiron', '@hubot github issue stop creation');
			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.issues.stop.already'));
			});
		});
	});

	context('user calls `github create an issue`', function() {
		it('should respond with the creating issues on crashes', function() {
			room.user.say('mimiron', '@hubot github issue create against github.com/user/repo when apps crash');
			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.issues.will.open.for.crash', 'github.com', 'user'));
			}).then(result => {
				room.user.say('mimiron', '@hubot github issue stop creation');
				return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
					expect(events.length).to.eql(1);
					expect(events[0].message).to.be.a('string');
					expect(events[0].message).to.eql(i18n.__('github.issues.stop.success'));
				});
			});
		});
	});

	context('test interval event scan', function() {
		it('should run', function() {
			// const fakeBrain = {
			// 	set: function(id, value) {},
			// 	get: function(id){ return undefined; }
			// };
			// room.robot.brain = fakeBrain;
			const user = 'user';
			const repo = 'repo';
			const res = {};
			issuesRewire.__get__('intervalEventScan')(room.robot, res, user, repo);
		});
	});

	context('test processCrashLogs', function() {
		it('should run', function() {
			// const fakeBrain = {
			// 	set: function(id, value) {},
			// 	get: function(id){ return undefined; }
			// };
			// room.robot.brain = fakeBrain;
			const user = 'user';
			const repo = 'repo';
			const res = {
				reply: function(str) {},
				send: function(str) {}
			};
			const resource = {
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
			const result = {};
			issuesRewire.__get__('processRecentCrashLogs')(room.robot, res, user, repo, resource, result);
		});
	});
});
