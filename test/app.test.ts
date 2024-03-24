import * as cdk from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'
import { test } from 'vitest'

import * as LinkScan from '../lib/link-scan/link-scan-stack'

test('Link scan stack created with expected resources', () => {
    const app = new cdk.App()
    const stack = new LinkScan.LinkScanStack(app, 'MyTestStack')

    const template = Template.fromStack(stack)

    template.hasResource('AWS::Lambda::Function', {
        Properties: {
            Handler: 'index.handler',
            Runtime: 'nodejs18.x',
            Timeout: 300,
        },
    })

    template.hasResource('AWS::IAM::Policy', {
        Properties: {
            PolicyDocument: {
                Statement: [
                    {
                        Action: 'ses:SendEmail',
                        Effect: 'Allow',
                        Resource: '*',
                    },
                ],
            },
        },
    })

    template.hasResource('AWS::Events::Rule', {
        Properties: {
            ScheduleExpression: 'cron(0 0 1 * ? *)',
        },
    })

    template.hasResource('AWS::Lambda::Permission', {
        Properties: {
            Action: 'lambda:InvokeFunction',
            Principal: 'events.amazonaws.com',
        },
    })
})
