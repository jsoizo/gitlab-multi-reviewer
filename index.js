// Load env vars from file (for development)
require('dotenv').config();

// Initialize logger
const log4js = require('log4js');
const logger = log4js.getLogger();
logger.level = process.env.LOG_LEVEL || 'info';
console.log(logger.level);

// Initialize marked to parse MR description markdown
const marked = require('marked');

// Initialize GitLab API Client
const gitLabApiUrl = process.env.GITLAB_API_URL || 'http://gitlab.com';
if (! process.env.GITLAB_API_TOKEN) {
  logger.fatal('GITLAB_API_TOKEN must be set');
  process.exit(1);
}
const gitLabApiToken = process.env.GITLAB_API_TOKEN;
const GitLab = require('gitlab/dist/es5').default
const gitLabApi = new GitLab({
  url: gitLabApiUrl,
  token: gitLabApiToken
});

/**
 * Execute merge from source to target
 * @param {BigInteger} projectId
 * @param {BigInteger} mergeRequestIid
 */
async function executeMerge(projectId, mergeRequestIid) {
  const mergeRequest = gitLabApi.MergeRequests;
  logger.debug('Get Merge Request Info');
  logger.debug(await mergeRequest.show(projectId, mergeRequestIid));

  logger.info('Accept merge request');
  await mergeRequest.accept(
    projectId,
    mergeRequestIid,
    { should_remove_source_branch: true, merge_when_pipeline_succeeds: true }
  ).catch((err) => {
    logger.error('Failed to merge via API');
    logger.error(err);
    throw err;
  });
  logger.info('Success to accept merge reqest!!!');
}

/**
 * Check whether all reviewer accepted it or not.
 * Reviewer and review status list is described as TODO List under `Reviewer` heading
 * e.g. ## Reviewer\n - [ ] @foo\n - [ ] @bar
 * @param {String} descriptionText
 */
function isAllReviewerAccepted(descriptionText) {
  const tokens = marked.lexer(descriptionText);
  logger.debug('Description parsed to markdown tokens.')
  logger.debug(`Tokens: ${JSON.stringify(tokens)}`);
  const reviewerListItems = [];
  let _isUnderReviwerHeading = false;
  let _currentHeadingDepth = 0;
  tokens.forEach((token) => {
    logger.debug(`Current token: ${JSON.stringify(token)}`);
    if (token.type === 'heading' && token.text.toLowerCase() === 'reviewer') { // e.g. ## Reviewer
      logger.debug('Start "reviewer" headings');
      _isUnderReviwerHeading = true;
      _currentHeadingDepth = token.depth;
    }
    if (_isUnderReviwerHeading) {
      if (token.type === 'list_item_start' && token.task) { // e.g. - [ ] foo
        logger.debug('Found reviewer list item');
        reviewerListItems.push(token);
      }
      // End of section
      if (token.type === 'heading' && token.depth <= _currentHeadingDepth && token.text.toLowerCase() !== 'reviewer') { // e.g. ## Bar
        logger.debug('End "reviewer" headings');
        _isUnderReviwerHeading = false;
        _currentHeadingDepth = 0;
      }
    }
  });
  logger.debug(`Got reviewer lists: ${JSON.stringify(reviewerListItems)}`);
  return reviewerListItems.length > 0 && reviewerListItems.every(token => token.checked);
}

// Main
const app = require('express')();
const { json } = require('body-parser');
const { PORT = 3000 } = process.env;

app.use(json());
app.post('/', (req, res) => {
  if (req.get('x-gitlab-event') === 'Merge Request Hook') {
    logger.info('Receive http request from GitLab');
    const body = req.body;
    const descriptionText = body.object_attributes.description;
    // logger.debug(body.object_attributes);
    if (isAllReviewerAccepted(descriptionText)) {
      logger.info(`Merge!! ${body.object_attributes.url}`);
      const targetProjectId = body.object_attributes.target.id;
      const mergeRequestIid = body.object_attributes.iid;
      executeMerge(targetProjectId, mergeRequestIid);
    }
    res.status(200).send();
  } else {
    res.status(400).send('Only MR hook is accepted');
  }
});
app.listen(PORT, () => logger.info(`Listening on port ${PORT}`));
