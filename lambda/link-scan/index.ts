import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2'
import { Handler } from 'aws-cdk-lib/aws-lambda'
import { LinkChecker } from 'linkinator'

const SES_EMAIL_FROM = 'info@clearviction.org'
const SES_EMAIL_TO = 'info@clearviction.org'

export interface LinkData {
    passed: boolean
    linksScanned: number
    brokenLinksCount: number
    brokenLinks: {
        url: string
        parent?: string
    }[]
}

const URL_TO_SCAN = 'http://clearviction.org'
const REGION = 'us-west-2'

export const handler: Handler = async () => {
    const returnData: LinkData = await checkLinks()

    if (!returnData.passed) {
        return await sendEmail(returnData)
    }

    return
}

export const checkLinks = async () => {
    const checker = new LinkChecker()
    const brokenLinks: LinkData['brokenLinks'] = []

    try {
        checker.on('link', (result) => {
            if (result.state === 'BROKEN') {
                const newBrokenLink = {
                    url: result.url,
                    parent: result.parent,
                }
                brokenLinks.push(newBrokenLink)
            }
        })

        const result = await checker.check({
            path: URL_TO_SCAN,
            recurse: true,
        })

        const brokenLinksCount = result.links.filter(
            (result) => result.state === 'BROKEN'
        )

        return {
            passed: result.passed,
            linksScanned: result.links.length,
            brokenLinksCount: brokenLinksCount.length,
            brokenLinks,
        }
    } catch (error) {
        throw new Error('Check failed')
    }
}

export const sendEmail = async (data: LinkData) => {
    const ses = new SESv2Client({ region: REGION })
    const scanDate = new Date().toLocaleString()

    const input = sendEmailParams(data, scanDate)
    const sendEmailCommand = new SendEmailCommand(input)

    try {
        return await ses.send(sendEmailCommand)
    } catch (error) {
        throw new Error('Email failed to send')
    }
}

const sendEmailParams = (
    { passed, linksScanned, brokenLinksCount, brokenLinks }: LinkData,
    scanDate: string
) => {
    return {
        FromEmailAddress: SES_EMAIL_FROM,
        Destination: {
            ToAddresses: [SES_EMAIL_TO],
        },
        Content: {
            Simple: {
                Subject: {
                    Charset: 'UTF-8',
                    Data: `Monthly link scan report: ${scanDate}`,
                },
                Body: {
                    Html: {
                        Charset: 'UTF-8',
                        Data: getHtmlContent({
                            passed,
                            linksScanned,
                            brokenLinksCount,
                            brokenLinks,
                        }),
                    },
                },
            },
        },
    }
}

const getHtmlContent = ({
    passed,
    linksScanned,
    brokenLinksCount,
    brokenLinks,
}: LinkData) => {
    return `
        <html>
            <body>
                <h1>Monthly link scan report</h1>
                <p>
                    Every month all of the internal and external links on the Clearviction website are scanned in search of any broken links. Here are the results from the most recent scan:
                </p>
                <h2>Overview</h2>
                <ul>
                    <li style="font-size:18px">Passed: <b>${passed}</b></li>
                    <li style="font-size:18px">Links scanned: <b>${linksScanned}</b></li>
                    <li style="font-size:18px">Broken links found: <b>${brokenLinksCount}</b></li>
                </ul>
                <h2>Details</h2>
                ${mapBrokenLinks(brokenLinks)}
            </body>
        </html>
    `
}

const mapBrokenLinks = (brokenLinks: LinkData['brokenLinks']) => {
    return brokenLinks.map((link) => {
        return `<div>
                    <p style="font-size:14px"><b>Broken link url:</b> <a href="${link.url}">${link.url}</a></p>
                    <p style="font-size:14px">Found on CV website page: <a href="${link.parent}">${link.parent}</a></p>
                </div>`
    })
}
