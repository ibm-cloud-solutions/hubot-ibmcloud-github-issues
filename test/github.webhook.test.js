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

// Leverage rewire to gain access to internal functions.
const rewire = require('rewire');

// Passing arrow functions to mocha is discouraged: https://mochajs.org/#arrow-functions
// return promises from mocha tests rather than calling done() - http://tobyho.com/2015/12/16/mocha-with-promises/
describe('Interacting with Github Subscriptions via Reg Ex', function() {

	let room;
	let webhookRewire;

	before(function() {
		webhookRewire = rewire(path.resolve(__dirname, '..', 'src', 'scripts', 'github.webhook'));
	});

	beforeEach(function() {
		room = helper.createRoom();
	});

	afterEach(function() {
		room.destroy();
	});

	// ------------------------------------------------------------------------
	// PUSH EVENT TESTS
	// ------------------------------------------------------------------------

	context('Single push event received', function() {
		it('should emit the push event attachment', function() {
			let request = {
				headers: {
					'x-github-event': 'push'
				},
				body: JSON.stringify({
					commits: [ {
						committer: 'Joe',
						message: 'JoeMessage',
						url: 'JoeUrl'
					} ]
				})
			};
			// Start listening for emits.
			let portendCalled = portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].attachments).to.be.a('array');
				expect(events[0].attachments.length).to.eql(1);
				expect(events[0].attachments[0].fallback).to.eql('GitHub event detected: code delivered.');
				expect(events[0].attachments[0].title).to.eql('GitHub event detected: code delivered.');
				expect(events[0].attachments[0].fields.length).to.eql(3);
				expect(events[0].attachments[0].fields[0].title).to.eql('Author');
				expect(events[0].attachments[0].fields[0].value).to.eql('Joe');
				expect(events[0].attachments[0].fields[1].title).to.eql('Message');
				expect(events[0].attachments[0].fields[1].value).to.eql('JoeMessage');
				expect(events[0].attachments[0].fields[2].title).to.eql('URL');
				expect(events[0].attachments[0].fields[2].value).to.eql('JoeUrl');
			});
			// Simulate the event sent from Github.  Should trigger listener above.
			webhookRewire.__get__('handleWebhook')(room.robot, request, null);
			return portendCalled;
		});
	});

	context('Two push events received', function() {
		it('should emit two push event attachments', function() {
			let request = {
				headers: {
					'x-github-event': 'push'
				},
				body: JSON.stringify({
					commits: [ {
						committer: 'Joe',
						message: 'JoeMessage',
						url: 'JoeUrl'
					}, {
						committer: 'Jane',
						message: 'JaneMessage',
						url: 'JaneUrl'
					} ]
				})
			};
			// Start listening for emits.
			let portendCalled = portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].attachments).to.be.a('array');
				expect(events[0].attachments.length).to.eql(2);
				expect(events[0].attachments[0].fallback).to.eql('GitHub event detected: code delivered.');
				expect(events[0].attachments[0].title).to.eql('GitHub event detected: code delivered.');
				expect(events[0].attachments[0].fields.length).to.eql(3);
				expect(events[0].attachments[0].fields[0].title).to.eql('Author');
				expect(events[0].attachments[0].fields[0].value).to.eql('Joe');
				expect(events[0].attachments[0].fields[1].title).to.eql('Message');
				expect(events[0].attachments[0].fields[1].value).to.eql('JoeMessage');
				expect(events[0].attachments[0].fields[2].title).to.eql('URL');
				expect(events[0].attachments[0].fields[2].value).to.eql('JoeUrl');
				expect(events[0].attachments[1].fields.length).to.eql(3);
				expect(events[0].attachments[1].fields[0].title).to.eql('Author');
				expect(events[0].attachments[1].fields[0].value).to.eql('Jane');
				expect(events[0].attachments[1].fields[1].title).to.eql('Message');
				expect(events[0].attachments[1].fields[1].value).to.eql('JaneMessage');
				expect(events[0].attachments[1].fields[2].title).to.eql('URL');
				expect(events[0].attachments[1].fields[2].value).to.eql('JaneUrl');
			});
			// Simulate the event sent from Github.  Should trigger listener above.
			webhookRewire.__get__('handleWebhook')(room.robot, request, null);
			return portendCalled;
		});
	});

	// ------------------------------------------------------------------------
	// PULL REQUEST EVENT TESTS
	// ------------------------------------------------------------------------

	context('Pull request event received', function() {
		it('should emit the pull request event attachment', function() {
			let request = {
				headers: {
					'x-github-event': 'pull_request'
				},
				body: JSON.stringify({
					action: 'opened',
					pull_request: {
						title: 'EventTitle',
						base: {
							repo: {
								full_name: 'RepoName'
							}
						},
						user: {
							login: 'Joe'
						},
						_links: {
							self: 'EventURL'
						}
					}
				})
			};
			// Start listening for emits.
			let portendCalled = portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].attachments).to.be.a('array');
				expect(events[0].attachments.length).to.eql(1);
				expect(events[0].attachments[0].fallback).to.eql('GitHub event detected: pull request.');
				expect(events[0].attachments[0].title).to.eql('GitHub event detected: pull request.');
				expect(events[0].attachments[0].fields.length).to.eql(4);
				expect(events[0].attachments[0].fields[0].title).to.eql('Title');
				expect(events[0].attachments[0].fields[0].value).to.eql('EventTitle');
				expect(events[0].attachments[0].fields[1].title).to.eql('Repository');
				expect(events[0].attachments[0].fields[1].value).to.eql('RepoName');
				expect(events[0].attachments[0].fields[2].title).to.eql('Originator');
				expect(events[0].attachments[0].fields[2].value).to.eql('Joe');
				expect(events[0].attachments[0].fields[3].title).to.eql('URL');
				expect(events[0].attachments[0].fields[3].value).to.eql('EventURL');
			});
			// Simulate the event sent from Github.  Should trigger listener above.
			webhookRewire.__get__('handleWebhook')(room.robot, request, null);
			return portendCalled;
		});
	});

	// ------------------------------------------------------------------------
	// ISSUE OPEN EVENT TESTS
	// ------------------------------------------------------------------------

	context('Issue open event received', function() {
		it('should emit the issue open event attachment', function() {
			let request = {
				headers: {
					'x-github-event': 'issue'
				},
				body: JSON.stringify({
					action: 'opened',
					issue: {
						title: 'EventTitle',
						body: 'EventBody',
						url: 'EventURL'
					}
				})
			};
			// Start listening for emits.
			let portendCalled = portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].attachments).to.be.a('array');
				expect(events[0].attachments.length).to.eql(1);
				expect(events[0].attachments[0].fallback).to.eql('GitHub event detected: issue opened.');
				expect(events[0].attachments[0].title).to.eql('GitHub event detected: issue opened.');
				expect(events[0].attachments[0].fields.length).to.eql(3);
				expect(events[0].attachments[0].fields[0].title).to.eql('Title');
				expect(events[0].attachments[0].fields[0].value).to.eql('EventTitle');
				expect(events[0].attachments[0].fields[1].title).to.eql('Description');
				expect(events[0].attachments[0].fields[1].value).to.eql('EventBody');
				expect(events[0].attachments[0].fields[2].title).to.eql('URL');
				expect(events[0].attachments[0].fields[2].value).to.eql('EventURL');
			});
			// Simulate the event sent from Github.  Should trigger listener above.
			webhookRewire.__get__('handleWebhook')(room.robot, request, null);
			return portendCalled;
		});
	});

});
