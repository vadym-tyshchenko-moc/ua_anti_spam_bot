import { Composer } from 'grammy';

import { messageQuery } from '../../const';
import type { GrammyContext, GrammyMiddleware } from '../../types';
import { isNotChannel, onlyNotDeletedFilter } from '../filters';
import {
  botActiveMiddleware,
  botRedisActive,
  ignoreOld,
  logContextMiddleware,
  onlyNotAdmin,
  onlyWhenBotAdmin,
  onlyWithText,
  parseCards,
  parseMentions,
  parseText,
  parseUrls,
  performanceEndMiddleware,
  performanceStartMiddleware,
} from '../middleware';

export interface MessagesComposerProperties {
  noCardsComposer: Composer<GrammyContext>;
  noUrlsComposer: Composer<GrammyContext>;
  noMentionsComposer: Composer<GrammyContext>;
  noForwardsComposer: Composer<GrammyContext>;
  swindlersComposer: Composer<GrammyContext>;
  strategicComposer: Composer<GrammyContext>;
}

/**
 * @description Message handling composer
 * */
export const getMessagesComposer = ({
  noCardsComposer,
  noUrlsComposer,
  noMentionsComposer,
  noForwardsComposer,
  strategicComposer,
  swindlersComposer,
}: MessagesComposerProperties) => {
  const messagesComposer = new Composer<GrammyContext>();

  /**
   * Only these messages will be processed in this composer
   * */
  const readyMessagesComposer = messagesComposer
    // Queries to follow
    .on(messageQuery)
    // Filtering messages from channel
    .filter((context) => isNotChannel(context))
    // Filtering messages
    .use(botRedisActive, ignoreOld(60), botActiveMiddleware, onlyNotAdmin, onlyWhenBotAdmin)
    // Parse message text and add it to state
    .use(parseText, onlyWithText)
    // Handle performance start
    .use(performanceStartMiddleware);

  /**
   * Registers a message handler module with correct filter to not make extra checks
   * */
  const registerModule = (middleware: Composer<GrammyContext> | GrammyMiddleware) => {
    readyMessagesComposer.filter((context) => onlyNotDeletedFilter(context)).use(middleware);
  };

  /**
   * Register modules.
   * The order should be right
   * */
  registerModule(swindlersComposer);

  registerModule(parseUrls);
  registerModule(noUrlsComposer);

  registerModule(parseMentions);
  registerModule(noMentionsComposer);

  registerModule(parseCards);
  registerModule(noCardsComposer);

  registerModule(noForwardsComposer);

  registerModule(strategicComposer);

  readyMessagesComposer.use(performanceEndMiddleware);
  readyMessagesComposer.use(logContextMiddleware);

  return { messagesComposer };
};
