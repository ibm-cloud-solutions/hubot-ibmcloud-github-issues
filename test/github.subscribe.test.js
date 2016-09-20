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
describe('Interacting with Github Subscriptions via Reg Ex', function() {

	let room;

	before(function() {
		mockGithubUtils.setupMockery();
	});

	beforeEach(function() {
		room = helper.createRoom();
	});

	afterEach(function() {
		room.destroy();
	});

	// ------------------------------------------------------------------------
	// SUBSCRIBE TESTS
	// ------------------------------------------------------------------------
	context('user calls `github subscribe user/repoNoWebhooks`', function() {
		it('should respond with successful subscription creation', function() {
			room.user.say('mimiron', '@hubot github subscribe user/repoNoWebhooks');

			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.subscribe.create.success'));
			});
		});
	});

	context('user calls `github subscribe user/repoExistingWebhooks`', function() {
		it('should respond with already exists', function() {
			room.user.say('mimiron', '@hubot github subscribe user/repoExistingWebhooks');

			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.subscribe.already.exists', 'user', 'repoExistingWebhooks'));
			});
		});
	});

	context('user calls `github subscribe user/repoOtherWebhooks`', function() {
		it('should respond with successful subscription creation', function() {
			room.user.say('mimiron', '@hubot github subscribe user/repoOtherWebhooks');

			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.subscribe.create.success'));
			});
		});
	});

	context('user calls `github subscribe user/repoOtherWebhooks` but there is a connection issue', function() {
		it('should respond that there was an error fetching the webhooks', function() {
			room.user.say('mimiron', '@hubot github subscribe user/connectionError');

			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.subscribe.error.fetching.webhooks', 'user', 'connectionError'));
			});
		});
	});

	context('user calls `github subscribe user/repoCreateError` but there is a connection issue during creation', function() {
		it('should respond that there was an error during creation', function() {
			room.user.say('mimiron', '@hubot github subscribe user/repoCreateError');

			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.subscribe.create.failure', 'Github responded with response code: ' + 500));
			});
		});
	});

	// ------------------------------------------------------------------------
	// UNSUBSCRIBE TESTS
	// ------------------------------------------------------------------------

	context('user calls `github unsubscribe user/repoNoWebhooks`', function() {
		it('should respond saying no webhooks found', function() {
			room.user.say('mimiron', '@hubot github unsubscribe user/repoNoWebhooks');

			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.subscribe.no.webhooks', 'user', 'repoNoWebhooks'));
			});
		});
	});

	context('user calls `github unsubscribe user/repoExistingWebhooks`', function() {
		it('should respond successful deletion', function() {
			room.user.say('mimiron', '@hubot github unsubscribe user/repoExistingWebhooks');

			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.subscribe.delete.success', 'user', 'repoExistingWebhooks'));
			});
		});
	});

	context('user calls `github unsubscribe user/repoOtherWebhooks`', function() {
		it('should respond with no webhooks available', function() {
			room.user.say('mimiron', '@hubot github unsubscribe user/repoOtherWebhooks');

			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.subscribe.no.webhooks', 'user', 'repoOtherWebhooks'));
			});
		});
	});

	context('user calls `github unsubscribe user/repoOtherWebhooks` but there is a connection issue getting the list of webhooks', function() {
		it('should respond that there was an error fetching the webhooks', function() {
			room.user.say('mimiron', '@hubot github unsubscribe user/connectionError');

			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.subscribe.error.fetching.webhooks', 'user', 'connectionError'));
			});
		});
	});

	context('user calls `github unsubscribe user/repoDeleteError` but there is an error deleting', function() {
		it('should respond that there was an error', function() {
			room.user.say('mimiron', '@hubot github unsubscribe user/repoDeleteError');

			return portend.once(room.robot, 'ibmcloud.formatter').then(events => {
				expect(events.length).to.eql(1);
				expect(events[0].message).to.be.a('string');
				expect(events[0].message).to.eql(i18n.__('github.subscribe.delete.failure', 'Github responded with response code: ' + 500));
			});
		});
	});
});
