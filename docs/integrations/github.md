# GitHub Integration

If you plan on using GitHub with your bot, you'll need to configure a few details

## Personal Access Token

The GitHub [Personal Access Token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/) is what will enable the bot to execute actions on your behalf. You can configure the level of permissions that you want to give to this token as part of the token creation. At a minimum, it should have the `repo` scope selected, so that issues can be created and deployments can be triggered.

Be sure to record the token after it is generated for you. Once you navigate away from this page, you will not be able to view the token again.

## Domain (Optional)

By default, the public GitHub repository is used. If you're using GitHub Enterprise, you can configure the domain with this input.