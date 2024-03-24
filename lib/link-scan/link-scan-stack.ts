import { Duration, Stack, StackProps } from 'aws-cdk-lib'
import * as events from 'aws-cdk-lib/aws-events'
import * as targets from 'aws-cdk-lib/aws-events-targets'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs'
import * as path from 'path'

export class LinkScanStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props)

        const linkScanFn = new NodejsFunction(this, 'LambdaHandler', {
            entry: path.join(__dirname, '../../lambda/link-scan/index.ts'),
            handler: 'handler',
            runtime: Runtime.NODEJS_18_X,
            timeout: Duration.seconds(300),
            initialPolicy: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ses:SendEmail'],
                    resources: ['*'],
                }),
            ],
        })

        // Timezone UTC
        const scheduleLambda = new events.Rule(
            this,
            'monthlyOnTheFirstDayRule',
            {
                schedule: events.Schedule.cron({
                    day: '1',
                    hour: '0',
                    minute: '0',
                }),
            }
        )

        scheduleLambda.addTarget(
            new targets.LambdaFunction(linkScanFn, {
                event: events.RuleTargetInput.fromObject({}),
            })
        )

        targets.addLambdaPermission(scheduleLambda, linkScanFn)
    }
}
