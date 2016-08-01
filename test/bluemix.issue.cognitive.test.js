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

// Passing arrow functions to mocha is discouraged: https://mochajs.org/#arrow-functions
// return promises from mocha tests rather than calling done() - http://tobyho.com/2015/12/16/mocha-with-promises/
describe('Interacting with Github Issue Creation via Natural Language', function() {

	let room;
	let cf;

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


	context('user calls `issues help`', function() {
		it('should respond with the help', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				expect(event.message).to.be.a('string');
				expect(event.message).to.contain('hubot issue create against [name]/[repo] when apps crash');
				expect(event.message).to.contain('hubot issue stop creation');
				done();
			});

			var res = { message: {text: 'Please help me with issue creation on app crash', user: {id: 'anId'}}, response: room };
			room.robot.emit('github.issues.help', res, {});
		});
	});

	context('user calls `issue stop creation`', function() {
		it('should respond with the already stopped', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				expect(event.message).to.be.a('string');
				expect(event.message).to.contain(i18n.__('github.issues.stop.already'));
				done();
			});

			var res = { message: {text: 'stop issue creation', user: {id: 'anId'}}, response: room };
			room.robot.emit('github.issues.stop', res, {});
		});
	});

	context('user calls `create an issue`', function() {
		it('should respond with the creating issues on crashes', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				expect(event.message).to.be.a('string');
				expect(event.message).to.contain(i18n.__('github.issues.will.open.for.crash', 'user', 'repo'));
				done();
			});

			var res = { message: {text: 'start issue creation for user/repo', user: {id: 'anId'}}, response: room };
			room.robot.emit('github.issues.open', res, {user: 'user', repo: 'repo'});
		});
		it('should fail due to missing user parameter ', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				if (event.message) {
					expect(event.message).to.be.a('string');
					expect(event.message).to.contain(i18n.__('cognitive.parse.problem.user'));
					done();
				}
			});

			var res = { message: {text: 'open issue against repo', user: {id: 'mimiron'}}, response: room };
			room.robot.emit('github.issues.open', res, {repo: 'repo'});
		});

		it('should fail due to missing repo parameter ', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				if (event.message) {
					expect(event.message).to.be.a('string');
					expect(event.message).to.contain(i18n.__('cognitive.parse.problem.repo'));
					done();
				}
			});

			var res = { message: {text: 'open issue against user', user: {id: 'mimiron'}}, response: room };
			room.robot.emit('github.issues.open', res, {user: 'user'});
		});
	});

});
