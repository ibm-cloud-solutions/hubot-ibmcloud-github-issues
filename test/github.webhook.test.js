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
			// First subscribe for github events.
			room.user.say('mimiron', '@hubot github subscribe user/repoNoWebhooks');
			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.subscribe.create.success'));
			}).then(result => {
				let request = {
					headers: {
						'x-github-event': 'push'
					},
					body: {
						repository: {
							name: 'RepoName',
							hooks_url: 'hooks_url'
						},
						commits: [ {
							author: { username: 'Joe' },
							message: 'JoeMessage',
							url: 'CommitUrl'
						} ]
					}
				};
				// Start listening for emits.
				let portendCalled = portend.once(room.robot, 'ibmcloud.formatter').then(events => {
					expect(events.length).to.eql(1);
					expect(events[0].attachments).to.be.a('array');
					expect(events[0].attachments.length).to.eql(1);
					expect(events[0].attachments[0].fallback).to.eql('GitHub Code Delivered');
					expect(events[0].attachments[0].title).to.eql('GitHub Code Delivered');
					expect(events[0].attachments[0].title_link).to.eql('CommitUrl');
					expect(events[0].attachments[0].fields.length).to.eql(3);
					expect(events[0].attachments[0].fields[0].title).to.eql('Author');
					expect(events[0].attachments[0].fields[0].value).to.eql('Joe');
					expect(events[0].attachments[0].fields[1].title).to.eql('Repository');
					expect(events[0].attachments[0].fields[1].value).to.eql('RepoName');
					expect(events[0].attachments[0].fields[2].title).to.eql('Comment');
					expect(events[0].attachments[0].fields[2].value).to.eql('JoeMessage');
				});
				// Simulate the event sent from Github.  Should trigger listener above.
				webhookRewire.__get__('handleWebhook')(room.robot, request, null);
				return portendCalled;
			});
		});
	});

	context('Two push events received', function() {
		it('should emit two push event attachments', function() {
			// First subscribe for github events.
			room.user.say('mimiron', '@hubot github subscribe user/repoNoWebhooks');
			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.subscribe.create.success'));
			}).then(result => {
				let request = {
					headers: {
						'x-github-event': 'push'
					},
					body: {
						repository: {
							name: 'RepoName',
							hooks_url: 'hooks_url'
						},
						commits: [ {
							author: { username: 'Joe' },
							url: 'CommitUrl'
						}, {
							author: { username: 'Jane' },
							message: 'JaneMessage\n\nHope this part gets ignored',
							url: 'CommitUrl'
						} ]
					}
				};
				// Start listening for emits.
				let portendCalled = portend.once(room.robot, 'ibmcloud.formatter').then(events => {
					expect(events.length).to.eql(1);
					expect(events[0].attachments).to.be.a('array');
					expect(events[0].attachments.length).to.eql(2);
					expect(events[0].attachments[0].fallback).to.eql('GitHub Code Delivered');
					expect(events[0].attachments[0].title).to.eql('GitHub Code Delivered');
					expect(events[0].attachments[0].title_link).to.eql('CommitUrl');
					expect(events[0].attachments[0].fields.length).to.eql(3);
					expect(events[0].attachments[0].fields[0].title).to.eql('Author');
					expect(events[0].attachments[0].fields[0].value).to.eql('Joe');
					expect(events[0].attachments[0].fields[1].title).to.eql('Repository');
					expect(events[0].attachments[0].fields[1].value).to.eql('RepoName');
					expect(events[0].attachments[0].fields[2].title).to.eql('Comment');
					expect(events[0].attachments[0].fields[2].value).to.eql(i18n.__('github.subscribe.alert.no.comment'));
					expect(events[0].attachments[1].fields[0].title).to.eql('Author');
					expect(events[0].attachments[1].fields[0].value).to.eql('Jane');
					expect(events[0].attachments[1].fields[1].title).to.eql('Repository');
					expect(events[0].attachments[1].fields[1].value).to.eql('RepoName');
					expect(events[0].attachments[1].fields[2].title).to.eql('Comment');
					expect(events[0].attachments[1].fields[2].value).to.eql('JaneMessage');
				});
				// Simulate the event sent from Github.  Should trigger listener above.
				webhookRewire.__get__('handleWebhook')(room.robot, request, null);
				return portendCalled;
			});
		});
	});

	// ------------------------------------------------------------------------
	// PULL REQUEST EVENT TESTS
	// ------------------------------------------------------------------------

	context('Pull request event received', function() {
		it('should emit the pull request event attachment', function() {
			// First subscribe for github events.
			room.user.say('mimiron', '@hubot github subscribe user/repoNoWebhooks');
			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.subscribe.create.success'));
			}).then(result => {
				let request = {
					headers: {
						'x-github-event': 'pull_request'
					},
					body: {
						repository: {
							name: 'RepoName',
							hooks_url: 'hooks_url'
						},
						action: 'opened',
						pull_request: {
							title: 'EventTitle',
							base: { repo: { name: 'RepoName' } },
							user: { login: 'Joe' },
							html_url: 'EventUrl'
						}
					}
				};
				// Start listening for emits.
				let portendCalled = portend.once(room.robot, 'ibmcloud.formatter').then(events => {
					expect(events.length).to.eql(1);
					expect(events[0].attachments).to.be.a('array');
					expect(events[0].attachments.length).to.eql(1);
					expect(events[0].attachments[0].fallback).to.eql('GitHub Pull Request');
					expect(events[0].attachments[0].title).to.eql('GitHub Pull Request');
					expect(events[0].attachments[0].title_link).to.eql('EventUrl');
					expect(events[0].attachments[0].fields.length).to.eql(3);
					expect(events[0].attachments[0].fields[0].title).to.eql('Originator');
					expect(events[0].attachments[0].fields[0].value).to.eql('Joe');
					expect(events[0].attachments[0].fields[1].title).to.eql('Repository');
					expect(events[0].attachments[0].fields[1].value).to.eql('RepoName');
					expect(events[0].attachments[0].fields[2].title).to.eql('Comment');
					expect(events[0].attachments[0].fields[2].value).to.eql('EventTitle');
				});
				// Simulate the event sent from Github.  Should trigger listener above.
				webhookRewire.__get__('handleWebhook')(room.robot, request, null);
				return portendCalled;
			});
		});
	});

	// ------------------------------------------------------------------------
	// ISSUE OPEN EVENT TESTS
	// ------------------------------------------------------------------------

	context('Issue open event received', function() {
		it('should emit the issue open event attachment', function() {
			// First subscribe for github events.
			room.user.say('mimiron', '@hubot github subscribe user/repoNoWebhooks');
			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.subscribe.create.success'));
			}).then(result => {
				let request = {
					headers: {
						'x-github-event': 'issues'
					},
					body: {
						repository: {
							name: 'RepoName',
							hooks_url: 'hooks_url'
						},
						action: 'opened',
						issue: {
							title: 'EventTitle',
							user: { login: 'Joe' },
							body: 'EventBody',
							html_url: 'EventUrl'
						}
					}
				};
				// Start listening for emits.
				let portendCalled = portend.once(room.robot, 'ibmcloud.formatter').then(events => {
					expect(events.length).to.eql(1);
					expect(events[0].attachments).to.be.a('array');
					expect(events[0].attachments.length).to.eql(1);
					expect(events[0].attachments[0].fallback).to.eql('GitHub Issue Opened');
					expect(events[0].attachments[0].title).to.eql('GitHub Issue Opened');
					expect(events[0].attachments[0].title_link).to.eql('EventUrl');
					expect(events[0].attachments[0].fields.length).to.eql(3);
					expect(events[0].attachments[0].fields[0].title).to.eql('Originator');
					expect(events[0].attachments[0].fields[0].value).to.eql('Joe');
					expect(events[0].attachments[0].fields[1].title).to.eql('Repository');
					expect(events[0].attachments[0].fields[1].value).to.eql('RepoName');
					expect(events[0].attachments[0].fields[2].title).to.eql('Comment');
					expect(events[0].attachments[0].fields[2].value).to.eql('EventTitle');
				});
				// Simulate the event sent from Github.  Should trigger listener above.
				webhookRewire.__get__('handleWebhook')(room.robot, request, null);
				return portendCalled;
			});
		});
	});

});
