# gitlab-multi-reviewer

This automatically merge MR, when all reviewers who are listed as TODO under "Reviewer" or "reviewer" headings check own list item.

Below is example MR description.
On this case, MR is accepted only when all of TODO list items are checked.

```
# Awosome Merge Request

## any information

## Reviewer

### Engineer

- [ ] Alice
- [x] Bob

### Product Manager

- [ ] Charlie

```

## Setup

### with Docker

```
docker run -ti --rm \
  --p 3000:3000 \ # change if you set PORT env var
  --env-file .env \
  jsoizo/gitlab-multi-reviewer
```

Configurations are passed to app by environment variables.
Example `.env` file is as below.

```.env
GITLAB_API_URL=http://your.gitlab.server # default http://gitlab.com
GITLAB_API_TOKEN=1234567890abcdef # User Settings -> Access Tokens -> Personal Access Tokens with "api" scope
PORT=8000 # default 3000
```

Set integration settings to Project,
and check `Merge Request events` trigger.

```
Project -> Settings -> Integrations
```

### with Source

```
git clone https://github.com/jsoizo/gitlab-multi-reviewer.git
cd gitlab-multi-reviewer
vi .env
npm start
```

Environment variables and project settings are same as when with docker.
