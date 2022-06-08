/* eslint-disable no-restricted-syntax,no-await-in-loop,no-unreachable */
const fs = require('fs');
const path = require('path');

const FuzzySet = require('fuzzyset');
const { env } = require('typed-dotenv').config();
const stringSimilarity = require('string-similarity');
const { mentionRegexp, urlRegexp, optimizeText } = require('ukrainian-ml-optimizer');

// eslint-disable-next-line import/no-unresolved
const deleteFromMessage = require('./from-entities.json');
const { dataset } = require('../../dataset/dataset');
const { swindlersRegex } = require('../creator');
const { googleService } = require('../services/google.service');

const sentMentionsFromStart = [];
const originalDiiaBots = ['@Diia_help_bot'];

const swindlersBotsFuzzySet = FuzzySet(dataset.swindlers_bots);

const SWINDLER_SETTINGS = {
  DELETE_CHANCE: 0.8,
  LOG_CHANGE: 0.5,
};

/**
 * @param {MtProtoClient} mtProtoClient
 * @param {any} chatPeers - TODO add defined type
 * @param {SwindlersTensorService} swindlersTensorService
 * @param {UserbotStorage} userbotStorage
 * @param {string} message
 * */
const handleSwindlers = async (mtProtoClient, chatPeers, swindlersTensorService, userbotStorage, message) => {
  const finalMessage = message.includes("Looks like swindler's message") ? message.split('\n').slice(3).join('\n') : message;

  if (!mentionRegexp.test(finalMessage) && !urlRegexp.test(finalMessage)) {
    return;
  }

  const processFoundSwindler = (spamRate) => {
    console.info(true, spamRate, message);

    userbotStorage.swindlerMessages.push(finalMessage, message);
    const isUniqueSwindler = userbotStorage.isUniqueText(finalMessage, userbotStorage.swindlerMessages, 0.95);

    if (isUniqueSwindler) {
      googleService.appendToSheet(env.GOOGLE_SPREADSHEET_ID, env.GOOGLE_SWINDLERS_SHEET_NAME, finalMessage, 'B6:B');
      userbotStorage.swindlerMessages.push(finalMessage);
      mtProtoClient.sendPeerMessage(finalMessage, chatPeers.swindlersChat);
    }
  };

  /**
   * Tensor try
   * The fastest
   * */
  const { isSpam, spamRate } = await swindlersTensorService.predict(finalMessage, 0.8);

  if (isSpam) {
    return processFoundSwindler(spamRate);
  }

  /**
   * Regex try
   * The fastest
   * */
  const isSwindlersSite = swindlersRegex.test(finalMessage.toLowerCase());

  if (isSwindlersSite) {
    return processFoundSwindler();
  }

  const mentions = message.match(mentionRegexp);
  if (mentions) {
    // Not a swindler, official dia bot
    if (mentions.includes(originalDiiaBots[0])) {
      return;
    }

    const foundSwindlerMention = mentions.find((value) => (swindlersBotsFuzzySet.get(value) || [0])[0] > 0.9);

    if (foundSwindlerMention) {
      return processFoundSwindler();
    }
  }

  /**
   * Compare try
   * The slowest
   * */
  let lastChance = 0;
  let maxChance = 0;
  const foundSwindler = dataset.swindlers.some((text) => {
    lastChance = stringSimilarity.compareTwoStrings(optimizeText(finalMessage), text);

    if (lastChance > maxChance) {
      maxChance = lastChance;
    }

    return lastChance >= SWINDLER_SETTINGS.LOG_CHANGE;
  });

  if (foundSwindler) {
    return processFoundSwindler();
  }

  /**
   * Help try
   * */
  const swindlersWords = ['виплат', 'допомог', 'підтримк', 'фінанс', 'приватбанк', 'приват банк', 'єпідтри', 'дія', 'дії'];
  const isHelp = swindlersWords.some((item) => finalMessage.toLowerCase().includes(item));

  if (isHelp) {
    const isUnique = userbotStorage.handleHelpMessage(finalMessage);
    if (isUnique) {
      mtProtoClient.sendPeerMessage(message, chatPeers.helpChat);
      console.info(null, spamRate, message);
      return;
    }
  }

  console.info(false, spamRate, message);
};

/**
 * @param {MtProtoClient} mtProtoClient
 * @param {any} chatPeers - TODO add defined type
 * @param {TensorService} tensorService
 * @param {SwindlersTensorService} swindlersTensorService
 * @param {ProtoUpdate} updateInfo
 * @param {UserbotStorage} userbotStorage
 * */
const updatesHandler = async (mtProtoClient, chatPeers, tensorService, swindlersTensorService, updateInfo, userbotStorage) => {
  const allowedTypes = ['updateEditChannelMessage', 'updateNewChannelMessage'];

  const newMessageUpdates = updateInfo.updates.filter(
    (anUpdate) =>
      allowedTypes.includes(anUpdate._) &&
      anUpdate.message?.message &&
      anUpdate.message.peer_id?.channel_id !== chatPeers.trainingChat.channel_id,
  );
  if (!newMessageUpdates || newMessageUpdates.length === 0) {
    return;
  }

  for (const update of newMessageUpdates) {
    const { message } = update.message;
    await handleSwindlers(mtProtoClient, chatPeers, swindlersTensorService, userbotStorage, message);
    // eslint-disable-next-line no-continue
    continue;

    let clearMessageText = message;

    const mentions = clearMessageText.match(mentionRegexp);
    const urls = clearMessageText.match(urlRegexp);

    const telegramLinks = [...(mentions || []), ...(urls || [])];

    clearMessageText = clearMessageText.replace(mentionRegexp, ' ');
    clearMessageText = clearMessageText.replace(urlRegexp, ' ');

    deleteFromMessage.forEach((deleteWord) => {
      clearMessageText = clearMessageText.replace(deleteWord, ' ');
    });

    clearMessageText = clearMessageText.replace(/  +/g, ' ').split(' ').slice(0, 15).join(' ');

    const { isSpam, spamRate } = await tensorService.predict(clearMessageText, 0.7);
    console.info(isSpam, spamRate, message);

    if (isSpam && spamRate < 0.9) {
      const isNew = userbotStorage.handleMessage(clearMessageText);

      if (telegramLinks.length) {
        telegramLinks.forEach((mention) => {
          if (!deleteFromMessage.includes(mention) && !sentMentionsFromStart.includes(mention)) {
            sentMentionsFromStart.push(mention);
            deleteFromMessage.push(mention);

            fs.writeFileSync(path.join(__dirname, './from-entities.json'), JSON.stringify(deleteFromMessage, null, 2));

            mtProtoClient.sendSelfMessage(mention);
          }
        });
      }

      if (isNew) {
        mtProtoClient.sendPeerMessage(clearMessageText, chatPeers.trainingChat).catch(() => console.error('send message error'));
      }
    }
  }
};

module.exports = {
  updatesHandler,
  handleSwindlers,
};
