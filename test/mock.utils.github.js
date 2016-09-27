/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';

const nock = require('nock');
nock.disableNetConnect();
nock.enableNetConnect('localhost');

const endpoint = 'https://api.github.com';

module.exports = {

	setupMockery: function() {
		let githubScope = nock(endpoint)
			.persist();

		githubScope.get('/repos/user/repo/issues?state=open&sort=updated')
			.reply(200, [{title: 'issue1', number: 1}]);

		githubScope.post('/repos/user/repo/issues')
			.reply(200, {number: 2});

		// Testing a subscription request that works.  No existing webhooks.
		githubScope.get('/repos/user/repoNoWebhooks/hooks')
			.reply(200, []);
		githubScope.post('/repos/user/repoNoWebhooks/hooks')
			.reply(201, { url: 'hooks_url' });

		// Testing a subscription request that fails due to an existing one.
		githubScope.get('/repos/user/repoExistingWebhooks/hooks')
			.reply(200, [{url: 'https://api.github.com/webhook/id', config: {url: 'http://localhost:3000/github/webhook'}}]);
		githubScope.delete('/webhook/id')
			.reply(204);

		// Testing a subscription request that success, but there are other
		// existing webhooks not created by this bot.
		githubScope.get('/repos/user/repoOtherWebhooks/hooks')
			.reply(200, [{config: {url: 'http://some.other/webhook'}}]);
		githubScope.post('/repos/user/repoOtherWebhooks/hooks')
			.reply(201, { url: 'hooks_url' });

		// Testing a failure to retrieve webhooks from GitHub.
		githubScope.get('/repos/user/connectionError/hooks')
			.reply(500);

		// Simulate successfully fetching webhook, but Github failure during delete.
		githubScope.get('/repos/user/repoDeleteError/hooks')
			.reply(200, [{url: 'https://api.github.com/webhook/error', config: {url: 'http://localhost:3000/github/webhook'}}]);
		githubScope.delete('/webhook/error')
			.reply(500);

		// Simulate successfully fetching empty webhook list, but Github failure during delete.
		githubScope.get('/repos/user/repoCreateError/hooks')
			.reply(200, []);
		githubScope.post('/repos/user/repoCreateError/hooks')
			.reply(500);

	}
};
