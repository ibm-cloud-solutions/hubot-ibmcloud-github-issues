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
	}
};
