import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2'
import { mockClient } from 'aws-sdk-client-mock'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { checkLinks, LinkData, sendEmail } from '../lambda/link-scan/index'

describe('sendEmail function', async () => {
    const sesv2Mock = mockClient(SESv2Client)

    const linkData: LinkData = {
        passed: false,
        linksScanned: 10,
        brokenLinksCount: 2,
        brokenLinks: [
            {
                url: 'http://clearviction.org/broken1',
                parent: 'http://clearviction.org',
            },
            {
                url: 'http://clearviction.org/broken2',
                parent: 'http://clearviction.org/page2',
            },
        ],
    }

    it('sends an email with provided link data', async () => {
        sesv2Mock.on(SendEmailCommand).resolves({
            MessageId: '123',
        })

        const response = await sendEmail(linkData)

        expect(response).toEqual({ MessageId: '123' })
        expect(sesv2Mock.calls()).toHaveLength(1)
        expect(sesv2Mock.calls()[0].args[0].input).toMatchObject({
            FromEmailAddress: 'info@clearviction.org',
            Destination: { ToAddresses: ['info@clearviction.org'] },
            Content: {
                Simple: {
                    Subject: {
                        Data: expect.stringContaining(
                            'Monthly link scan report'
                        ),
                    },
                    Body: {
                        Html: {
                            Data: expect.stringContaining(
                                '<h1>Monthly link scan report</h1>'
                            ),
                        },
                    },
                },
            },
        })
    })

    it('handles errors during the email send process', async () => {
        sesv2Mock.on(SendEmailCommand).rejects()

        expect(sendEmail(linkData)).rejects.toThrow('Email failed to send')
    })
})

describe('checkLinks function', async () => {
    afterEach(() => {
        vi.resetAllMocks()
    })

    vi.mock('linkinator', () => {
        const LinkChecker = vi.fn()

        LinkChecker.prototype.on = vi
            .fn()
            .mockImplementation((event, callback) => {
                if (event === 'link') {
                    callback({
                        state: 'BROKEN',
                        url: 'http://example.com/broken',
                        parent: 'http://example.com',
                    })
                    callback({ state: 'OK', url: 'http://example.com/ok' })
                }
            })

        LinkChecker.prototype.check = vi
            .fn()
            .mockResolvedValueOnce({
                links: [
                    { state: 'BROKEN', url: 'http://example.com/broken' },
                    { state: 'OK', url: 'http://example.com/ok' },
                ],
                passed: false,
            })
            .mockRejectedValueOnce(new Error('Check failed'))

        return { LinkChecker }
    })

    it('returns the correct link data', async () => {
        const linkData = await checkLinks()

        expect(linkData).toMatchObject({
            passed: false,
            linksScanned: 2,
            brokenLinksCount: 1,
            brokenLinks: [
                {
                    url: 'http://example.com/broken',
                    parent: 'http://example.com',
                },
            ],
        })
    })

    it('handles errors during the link scan process', async () => {
        expect(checkLinks()).rejects.toThrow('Check failed')
    })
})
