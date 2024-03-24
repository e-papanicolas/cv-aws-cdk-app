#!/usr/bin/env node
import { App, Tags } from 'aws-cdk-lib'

import { LinkScanStack } from '../lib/link-scan/link-scan-stack'

const app = new App()

const linkScanStack = new LinkScanStack(app, 'LinkScanStack')
Tags.of(linkScanStack).add('project', 'cv-website-link-scan')
