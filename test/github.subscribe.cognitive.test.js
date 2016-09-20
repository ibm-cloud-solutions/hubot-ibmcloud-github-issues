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
describe('Interacting with Github Subscriptions via Natural Language', function() {

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

	// ----------------------------------------------------
	// SUBSCRIBE TESTS
	// ----------------------------------------------------

	context('user asks to subscribe to a proper github user and repo', function() {
		it('should respond with successful subscription creation', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				expect(event.message).to.be.a('string');
				expect(event.message).to.eql(i18n.__('github.subscribe.create.success'));
				done();
			});

			const res = { message: {text: 'Help me monitor GitHub events', user: {id: 'anId'}}, response: room };
			room.robot.emit('github.subscribe', res, {user: 'user', repo: 'repoNoWebhooks'});
		});
	});

	context('user asks to subscribe to a github repo, but does not provide the user', function() {
		it('should respond with error about missing user', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				expect(event.message).to.be.a('string');
				expect(event.message).to.eql(i18n.__('cognitive.parse.problem.user'));
				done();
			});

			const res = { message: {text: 'Help me monitor GitHub events', user: {id: 'anId'}}, response: room };
			room.robot.emit('github.subscribe', res, {repo: 'repoNoWebhooks'});
		});
	});

	context('user asks to subscribe to github event, but does not provide the repo', function() {
		it('should respond with error about missing repo', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				expect(event.message).to.be.a('string');
				expect(event.message).to.eql(i18n.__('cognitive.parse.problem.repo'));
				done();
			});

			const res = { message: {text: 'Help me monitor GitHub events', user: {id: 'anId'}}, response: room };
			room.robot.emit('github.subscribe', res, {user: 'user'});
		});
	});

	// ----------------------------------------------------
	// UNSUBSCRIBE TESTS
	// ----------------------------------------------------

	context('user asks to unsubscribe to a proper github repo', function() {
		it('should respond with successful subscription deletion', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				expect(event.message).to.be.a('string');
				expect(event.message).to.eql(i18n.__('github.subscribe.delete.success'));
				done();
			});

			const res = { message: {text: 'Stop monitoring GitHub events', user: {id: 'anId'}}, response: room };
			room.robot.emit('github.unsubscribe', res, {user: 'user', repo: 'repoExistingWebhooks'});
		});
	});

	context('user asks to unsubscribe, but leaves out the user', function() {
		it('should respond with error about missing user', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				expect(event.message).to.be.a('string');
				expect(event.message).to.eql(i18n.__('cognitive.parse.problem.user'));
				done();
			});

			const res = { message: {text: 'Stop monitoring GitHub events', user: {id: 'anId'}}, response: room };
			room.robot.emit('github.unsubscribe', res, {repo: 'repoExistingWebhooks'});
		});
	});

	context('user asks to unsubscribe, but leaves out the repo', function() {
		it('should respond with error about missing repo', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				expect(event.message).to.be.a('string');
				expect(event.message).to.eql(i18n.__('cognitive.parse.problem.repo'));
				done();
			});

			const res = { message: {text: 'Stop monitoring GitHub events', user: {id: 'anId'}}, response: room };
			room.robot.emit('github.unsubscribe', res, {user: 'user'});
		});
	});
});
