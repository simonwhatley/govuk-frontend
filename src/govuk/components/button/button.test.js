/**
 * @jest-environment puppeteer
 */

const configPaths = require('../../../../config/paths.js')
const PORT = configPaths.ports.test

const baseUrl = 'http://localhost:' + PORT

describe('/components/button', () => {
  describe('/components/button/link', () => {
    it('triggers the click event when the space key is pressed', async () => {
      await page.goto(baseUrl + '/components/button/link/preview', { waitUntil: 'load' })

      const href = await page.evaluate(() => document.body.getElementsByTagName('a')[0].getAttribute('href'))

      await page.focus('a[role="button"]')

      // we need to start the waitForNavigation() before the keyboard action
      // so we return a promise that is fulfilled when the navigation and the keyboard action are respectively fulfilled
      // this is somewhat counter intuitive, as we humans expect to act and then wait for something.
      await Promise.all([
        page.waitForNavigation(),
        page.keyboard.press('Space')
      ])

      const url = await page.url()
      expect(url).toBe(baseUrl + href)
    })
  })

  describe('preventing double clicks', () => {
    // Click counting is done through using the button to submit
    // a form and counting sumbissions. It requires some bits of recurring
    // logic which are wrapped in the following helpers

    /**
       * Wraps the button rendered on the page in a form
       *
       * Examples don't do this and we need it to have something to submit
       */
    async function trackClicks () {
      page.evaluate(() => {
        const $button = document.querySelector('button')
        const $form = document.createElement('form')
        $button.parentNode.appendChild($form)
        $form.appendChild($button)

        window.__SUBMIT_EVENTS = 0
        $form.addEventListener('submit', (event) => {
          window.__SUBMIT_EVENTS++
          // Don't refresh the page, which will destroy the context to test against.
          event.preventDefault()
        })
      })
    }

    /**
       * Gets the number of times the form was submitted
       *
       * @returns {Number}
       */
    function getClicksCount () {
      return page.evaluate(() => window.__SUBMIT_EVENTS)
    }

    describe('not enabled', () => {
      it('does not prevent multiple submissions when feature', async () => {
        await page.goto(baseUrl + '/components/button/preview', {
          waitUntil: 'load'
        })

        await trackClicks()

        await page.click('button')
        await page.click('button')

        const clicksCount = await getClicksCount()

        expect(clicksCount).toBe(2)
      })
    })

    describe('using data-attributes', () => {
      it('prevents unintentional submissions when in a form', async () => {
        await page.goto(
          baseUrl + '/components/button/prevent-double-click/preview',
          { waitUntil: 'load' }
        )

        await trackClicks()

        await page.click('button')
        await page.click('button')

        const clicksCount = await getClicksCount()

        expect(clicksCount).toBe(1)
      })

      it('does not prevent intentional multiple clicks', async () => {
        await page.goto(
          baseUrl + '/components/button/prevent-double-click/preview',
          { waitUntil: 'load' }
        )

        await trackClicks()

        await page.click('button')
        await page.click('button', { delay: 1000 })

        const clicksCount = await getClicksCount()

        expect(clicksCount).toBe(2)
      })

      it('does not prevent subsequent clicks on different buttons', async () => {
        await page.goto(
          baseUrl + '/components/button/prevent-double-click/preview',
          { waitUntil: 'load' }
        )

        await trackClicks()

        // Clone button to have two buttons on the page
        await page.evaluate(() => {
          const $button = document.querySelector('button')
          const $buttonPrime = $button.cloneNode(true)

          document.querySelector('form').appendChild($buttonPrime)
        })

        await page.click('button:nth-child(1)')
        await page.click('button:nth-child(2)')

        const clicksCount = await getClicksCount()

        expect(clicksCount).toBe(2)
      })
    })
  })
})
