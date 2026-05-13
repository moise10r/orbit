Orbit — Product Brainstorm & Feature Roadmap

What is Orbit?

Orbit is an engineering release management platform. It gives teams a single place to track every deployment, understand what version is running in each environment, and get alerted the moment something breaks. The goal is to replace the spreadsheets, Slack threads, and memory that teams currently use to answer the question: "what exactly is running in production right now, and who put it there?"

The problem it solves is simple. Deployments happen across multiple environments, multiple services, triggered by multiple people and automated pipelines. When something breaks, the first 20 minutes are spent figuring out what changed and when. Orbit makes that instant.


---

Current state (v0.1 — what's built)

Authentication and workspaces
Users sign up, create a workspace, and invite team members. JWT-based auth with refresh token rotation. API keys for CI/CD pipelines so automated systems can report deployment status without user credentials.

Release management
Teams create releases with a semantic version, optional changelog in Markdown, and a commit SHA. Releases move through a lifecycle: draft → staged → deployed → rolled back or failed. A hard gate prevents deploying to production unless the release has been staged first.

Environments
Each workspace defines its own environments (development, staging, production). Deployments are tracked per environment so you can always see what version is where.

Deployment logs
Every deployment records who triggered it, when it started, when it finished, whether it succeeded or failed, and an optional log output. Status updates come in from CI/CD pipelines via API key auth.

Notifications
Slack webhooks and email (via Resend) fire on deployment failure and rollback. Idempotency keys prevent duplicate alerts when pipelines retry. Per-workspace quiet hours stop notifications outside business hours.


---

What's missing — features to build

This section is the full brainstorm. Not everything goes in v1. Priorities are discussed at the bottom.


1. Multi-service support

Right now a workspace has one set of releases. Most teams deploy multiple services (frontend, backend, worker, etc.). Each service needs its own release history, its own environments, and its own notification rules.

What's needed:
- Service entity — name, slug, repo URL, language/type
- Releases scoped to a service
- Dashboard that shows all services and their current deployed version per environment
- Cross-service deployment grouping — "release train" that deploys multiple services together


2. GitHub integration

The connection between a release and the code that built it should be automatic, not manual. When a deployment succeeds, Orbit should know exactly what commits are in that release.

What's needed:
- GitHub App installation (not OAuth — no token expiry)
- Webhook receiver for push, pull_request, deployment, deployment_status events
- Auto-create a release draft when a GitHub release is published
- Populate commit SHA and changelog from the GitHub release notes
- Link deployments back to the PRs they contain
- Show which PRs are in each release (diff between two release versions)
- Pull request gate: block deploy if open PRs on the release branch exist


3. CI/CD pipeline integration

Orbit should be the source of truth that CI/CD pipelines report into, not the other way around. GitHub Actions, CircleCI, and other runners should push deployment events to Orbit automatically.

What's needed:
- Official GitHub Action: moise10r/orbit-action — reports deployment start, success, failure
- Webhook endpoint for generic pipeline runners (CircleCI, Buildkite, Jenkins)
- Status badge — embeddable SVG showing current deployment status per environment
- Pipeline configuration validation — warn if a deploy to production is configured without a staging deploy first
- Deployment duration tracking and alerting if a deploy takes longer than the historical average


4. Environment health checks

Orbit knows what's deployed. It should also know whether it's actually healthy.

What's needed:
- HTTP health check per environment — configurable URL and expected response
- Scheduled ping every 60 seconds
- Mark environment as "degraded" or "down" based on consecutive failures
- Trigger a notification when health check fails after a recent deployment
- Historical uptime graph per environment
- SLA tracking — calculate uptime percentage over rolling 30-day window


5. Rollback automation

Manual rollback is slow. When a deployment fails or a health check goes red, Orbit should be able to trigger a rollback automatically.

What's needed:
- Auto-rollback configuration per environment — opt in, threshold-based
- Rollback finds the last successful deployment and re-deploys that version
- Audit log of automatic rollbacks with the reason (health check failure, explicit failure status)
- Rollback webhook — notify the pipeline to actually re-deploy the previous version
- One-click rollback from the dashboard without needing to find the previous version manually


6. Changelog automation

Every release has a changelog but nobody writes them. They should be generated automatically from commit messages and PR titles.

What's needed:
- Pull changelog from GitHub release notes if available
- Generate from conventional commits (feat:, fix:, chore:, etc.) if no release notes exist
- Categorise changes: features, bug fixes, performance, breaking changes
- Public changelog page per workspace — shareable with stakeholders and customers
- Slack command to post the latest release changelog to a channel
- RSS feed for the public changelog


7. Team and role management

Right now everyone in a workspace has the same permissions. Real teams need access control.

What's needed:
- Roles: owner, admin, engineer, viewer
- Viewer: can see deployments and releases, cannot trigger or create
- Engineer: can create releases and trigger deploys to non-production environments
- Admin: full access except billing
- Owner: full access including billing and workspace deletion
- Audit log — who did what and when, retained for 90 days
- Invite flow with email — invite link expires after 48 hours


8. Deployment approval workflow

Production deploys are dangerous. Some teams need a second set of eyes before anything goes live.

What's needed:
- Optional approval requirement per environment (most useful for production)
- Assign approvers — one or more users who must approve before deploy proceeds
- Approval request notification via Slack and email
- Time-bounded approval — auto-cancel if no approval within N hours
- Bypass for emergency deploys — requires owner role and creates an audit log entry
- Approval history on each deployment record


9. Metrics and analytics

Teams ask these questions regularly: how often are we deploying? How long do deploys take? How many rollbacks have we had this month? Orbit should answer them.

What's needed:
- Deployment frequency — deploys per day/week/month per service and environment
- Lead time — time from commit to production deploy
- Change failure rate — percentage of deploys that result in a rollback or failure
- Mean time to recovery — average time from failure to successful re-deploy
- Dashboard with these four DORA metrics
- Exportable as CSV or via API for data teams
- Trend chart — are things getting better or worse over the past 90 days?


10. Scheduled deployments

Some teams deploy on a schedule — maintenance windows, off-peak hours, coordinated release trains.

What's needed:
- Schedule a deployment to fire at a specific time
- Recurring schedule — deploy every Friday at 11pm UTC if a new release is staged
- Blackout windows — never deploy during defined periods (e.g. end of quarter)
- Pre-deploy checklist — list of manual steps that must be confirmed before the scheduled deploy fires
- Cancel or reschedule from the dashboard


11. Incident linking

When a deployment causes an incident, that connection should be recorded. Right now it lives in someone's head or a Slack thread.

What's needed:
- Mark a deployment as the cause of an incident
- Link to external incident trackers (PagerDuty, Opsgenie, Linear)
- Auto-create an incident when a production health check fails after deploy
- Incident timeline — shows deployment, first alert, acknowledgement, resolution
- Post-incident report template auto-populated with deployment context


12. Mobile and Slack-first experience

Most engineers aren't staring at a dashboard. They need answers in Slack.

What's needed:
- Slack app with slash commands: /orbit status, /orbit deploy, /orbit rollback, /orbit history
- Slack bot sends deploy summaries to a configured channel after each production deploy
- /orbit status returns current version per environment in a clean Slack message
- Push notifications for mobile — deployment failures wake you up, not just email
- Progressive web app — installable on mobile for on-call engineers


13. API and developer experience

Orbit is a platform. Other tools should be able to build on top of it.

What's needed:
- Public REST API with full OpenAPI documentation
- API versioning — /v1/, /v2/ with deprecation notices
- Rate limiting per API key
- Webhooks from Orbit — send events to any URL when deploys happen, fail, or roll back
- Official SDKs: TypeScript, Python, Go
- Terraform provider — manage environments and notification channels as code


14. Billing and plans

Free tier for small teams, paid for larger teams with more services and history.

What's needed:
- Free: 1 workspace, 2 services, 3 environments, 30-day history
- Pro ($29/month): 5 services, 10 environments, 1 year history, Slack integration, approval workflows
- Business ($89/month): unlimited services, unlimited environments, 3-year history, DORA metrics, SAML SSO
- Usage-based overages for API calls beyond plan limits
- Billing portal — manage subscription, download invoices, update payment method
- LemonSqueezy integration for payments


---

Feature priority for v1.1

The most valuable things to build next, in order:

1. Multi-service support — without this, Orbit only works for single-service teams. Most potential customers have multiple services. This is the biggest gap.

2. GitHub integration — auto-populating releases from GitHub releases and commits removes the main manual step in the current workflow. This is the feature that makes the daily experience feel automatic.

3. Deployment approval workflow — this is the feature that makes Orbit safe enough for production at companies with compliance requirements. Several potential customers have asked for this explicitly.

4. Team roles — cannot sell to companies with more than 5 people without access control.

5. DORA metrics — this is the feature that gets Orbit into engineering leadership conversations. CTOs and VPs of Engineering care about deployment frequency and change failure rate. The data is already there — it just needs to be surfaced.


---

Technical decisions to make

These are open questions that need a decision before building:

Real-time updates
The dashboard should update live when a deployment status changes. Options: WebSockets, Server-Sent Events, or polling. SSE is the simplest. WebSockets are needed if we want bidirectional communication (e.g. triggering deploys from the dashboard). Decision pending.

Database for metrics
Deployment event data is time-series. PostgreSQL can handle this at our current scale but TimescaleDB or ClickHouse would be better for the analytics features in v1.1. Should we add TimescaleDB now or migrate later? Decision pending.

Multi-region deployments
When a deployment covers multiple cloud regions, should Orbit track them as a single deployment or multiple? The current model is one deployment per environment. This may need to change. Decision pending.

GitHub App vs OAuth
Auth module currently supports OAuth. GitHub App is more reliable (no token expiry, workspace-level install). Should migrate before GitHub integration ships. This is already decided — see auth module discussion.


---

Out of scope

These are things people might ask for that Orbit deliberately does not do:

- Orbit is not a CI/CD runner. It tracks deployments; it does not execute them. GitHub Actions, CircleCI, and others do the actual work.
- Orbit is not an infrastructure provisioning tool. It does not create servers, Kubernetes clusters, or databases. Terraform does that.
- Orbit is not a secrets manager. It does not store environment variables or credentials. Use Doppler or AWS Secrets Manager for that.
- Orbit is not a log aggregation tool. It stores deploy log output but is not a replacement for Datadog, Splunk, or CloudWatch.


---

Open questions from last team discussion

- Should the public changelog be opt-in or opt-out per workspace? Default on would get us SEO value and customer visibility but some teams don't want public changelogs.
- Do we need a separate "rollback to version X" endpoint or is rollback always to the immediately previous successful deploy?
- Should quiet hours apply globally per workspace or per notification channel? Per channel is more flexible but more complex to configure.
- Is 30 days enough history on the free plan or does it make the product feel too limited to evaluate properly?
