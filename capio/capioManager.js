'use strict'
const request = require('request') // HTTP Manager
const rp = require('request-promise-native') // Native Promises wrapper around request
const fs = require('fs')
const chalk = require('chalk')
const CAPIO_TEMP_API_K = require('../utils/consts').CAPIO_TEMP_API_K
const CAPIO_API_POST_URL = require('../utils/consts').CAPIO_API_POST_URL
const CAPIO_API_GET_URL = require('../utils/consts').CAPIO_API_GET_URL
const TIMEOUT_DURATON = require('../utils/consts').TIMEOUT_DURATON
const createTranscript = require('../db').createTranscript

function getTranscript(file) {
  const POST_REQUEST_CONFIG = {
    url: CAPIO_API_POST_URL,
    method: 'POST',
    formData: {
      apiKey: CAPIO_TEMP_API_K,
      media: {
        value: fs.createReadStream(file.path),
        options: {
          contentType: file.mimetype
        }
      },
      async: 'true',
      timeout: TIMEOUT_DURATON // Wait 5 seconds before timing out
    }
  }
  // Returns a promise containing Capio transcriptID
  return rp(POST_REQUEST_CONFIG)
}

function checkIfAudioTranscribed(transcriptId, expressResponse) {
  let currentTimeout
  console.log(chalk.yellow('Pinging Capio to see if transcript is ready...'))
  const GET_REQUEST_CONFIG = {
    url: CAPIO_API_GET_URL + transcriptId,
    method: 'GET',
    headers: {
      apiKey: CAPIO_TEMP_API_K
    },
    timeout: TIMEOUT_DURATON // Wait 5 seconds before timing out
  }
  // TODO: Handle different types of timeouts
  request(GET_REQUEST_CONFIG, function(err, res, body) {
    if (err) {
      console.error(err)
      return
      // TODO: WHAT DO WE DO WITH THIS IN TRANSCRIPT IF WE ERROR?
    }
    if (res.statusCode === 202) {
      currentTimeout = setTimeout(checkIfAudioTranscribed, TIMEOUT_DURATON, transcriptId, expressResponse)
    } else if (res.statusCode === 200) {
      if (currentTimeout) clearTimeout(currentTimeout)
      createTranscript(transcriptId, body, expressResponse)
    } else {
      if (currentTimeout) clearTimeout(currentTimeout)
      // TODO: another response, send along error to Express
      return res.statusMessage
    }
  })
}

module.exports = {
  getTranscript,
  checkIfAudioTranscribed
}
