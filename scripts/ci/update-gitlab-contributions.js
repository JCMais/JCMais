#!/usr/bin/env node

import puppeteer from 'puppeteer'
import cheerio from 'cheerio'
import fsRaw from 'fs'
import { encodeNonAsciiHTML } from 'entities'

const fs = fsRaw.promises

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', `--window-size=1200,700`],
})

const main = async () => {
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 720 })

  await page.goto('https://gitlab.com/jcm_dev', {
    waitUntil: 'networkidle0',
  })

  /** @type puppeteer.ElementHandle<SVGElement> */
  const element = await page.waitForSelector('svg.contrib-calendar')

  const elementContents = await element.getProperty('outerHTML')

  const $ = cheerio.load(await elementContents.jsonValue())

  const $svg = $('svg').attr('xmlns', 'http://www.w3.org/2000/svg')

  // I could use getComputedStyle(document.querySelector(selector)) inside page.evaluate to get those instead...

  const colorMap = ['#ededed', '#acd5f2', '#7fa8c9', '#527ba0', '#254e77']

  $svg.find('rect').each((i, el) => {
    const $el = $(el)

    $el.attr('title', encodeNonAsciiHTML($el.attr('title')))
    $el.attr('fill', colorMap[$el.data('level') | 0])
  })
  $svg
    .find('text.user-contrib-text')
    .attr('fill', '#959494')
    .attr('font-size', '12px')

  const modifiedContents = $svg.parent().html()
  await fs.writeFile('public/gitlab-contributions.svg', modifiedContents)
}

let hasError = null
try {
  await main()
} catch (error) {
  console.error(error)
  hasError = !!error
} finally {
  await browser.close()
  process.exit(hasError ? 1 : 0)
}
