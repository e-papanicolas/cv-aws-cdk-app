# Link-scan architecture

## Overview

This is an AWS CDK application that invokes a lambda function which runs a [linkinator](https://github.com/JustinBeckwith/linkinator) scan on the Clearviction website on a monthly schedule with EventBridge, and reports any broken links via SES.

## Components

### CloudFormation

The application uses a CloudFormation stack `LinkScanStack`, to organize its resources. Tags are applied at the stack level, giving all of the subsequent connected resources a tag of `project: cv-website-link-scan` to identify them as part of this specific project.

### AWS Lambda

The lambda `link-scan` is designed to be an automated link checker within our AWS CDK application, specifically for monitoring and reporting broken links on the `clearviction.org` website. It utilizes the `linkinator` library to scan for broken links and AWS SES (Simple Email Service) for notifications.

The lambda `handler` function orchestrates the entire process by invoking `checkLinks` to perform the link scan, constructing a response object with the scan results, and sending an email using `sendEmail` if broken links are detected.

The `checkLinks` function uses the external dependency `linkinator` to do the actual link scanning. It executes the scan on `clearviction.org` recursively, so that it can scan all of the links it finds on each page, and returns `LinkData`, whose interface defines the structure for the data returned, including:

-   `passed`: A boolean indicating whether the website passed the link check (i.e., no broken links were found)
-   `linksScanned`: The total number of links scanned during the operation
-   `brokenLinksCount`: The count of broken links identified
-   `brokenLinks`: An array of objects, each representing a broken link and its parent page (_the page of the website on which the broken link was found_)

The `sendEmail` function of the lambda sends an email report using SES with the details of the link scan. It initializes the SES client configured for the `us-west-2` region, then calls a `sendEmailCommand` with parameters and a detailed HTML report.

`sendEmailParams`, `getHtmlContent`, and `mapBrokenLinks` are helper functions that prepare the parameters for the SES `sendEmailCommand` method, generate the HTML content for the email body, and format broken link objects into HTML strings for the email body.

### Amazon Simple Email Service (SES)

Manages sending the link scan results as an email to `info@cv`. To send emails to a different address, you must add it as a verified identity in SES.

### AWS Identity and Access Management (IAM)

The lambda function `linkScanFn` is configured to use a service role, which allows the lambda function to use `sendEmail` actions with SES.

### AWS EventBridge Scheduler

The stack uses an EventBridge rule `monthlyOnTheFirstDayRule`, that runs on a cron schedule **every first day of the month at 12:00am UTC**. When the matching event occurs, the event is routed to the target `linkScanFn`, the lambda function associated with the rule. We also give the event rule target permission to apply the rule to the link scan lambda.

## Overall Workflow

```
- On the first day of every month at 12:00 UTC the event rule invokes the lambda
- AWS Lambda executes the handler function in response to the trigger, which starts the link scanning process
- If the scan returns as having failed it constructs an email using helper functions and uses Amazon SES to send it to info@cv
- The lambda returns with metadata from the sendEmailCommand response, or an error
```

## Making Changes

1. Empty local `dist` folder _(if you had previously built it)_
1. Make changes locally
1. Add any appropriate unit tests and ensure no existing unit tests are broken
1. Before deploying any changes to production, it’s important to run the tests `npm run test`
1. Run `npm run build` (incudes a prebuild script that lints and formats)
1. Configure or sign in to the `AWS CLI` with `aws configure`
1. Make sure `docker desktop` is running
1. Run `cdk deploy`
1. Push changes to GitHub
