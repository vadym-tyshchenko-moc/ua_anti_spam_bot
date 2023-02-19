import type { NextFunction } from 'grammy';
import type { GrammyContext } from 'types';

import { logSkipMiddleware } from '../../utils';

const TELEGRAM_FORWARD_USER_ID = 777_000;
const CHANNEL_BOT_ID = 136_817_688;

/**
 * @description
 * Allow to execute next middlewares only if the user is not admin
 *
 * Reversed copy from
 * @see https://github.com/backmeupplz/grammy-middlewares/blob/main/src/middlewares/onlyAdmin.ts
 * */
export async function onlyNotAdmin(context: GrammyContext, next: NextFunction) {
  // TODO use for ctx prod debug
  // console.info('enter onlyNotAdmin ******', ctx.chat?.title, '******', ctx.state.text);

  /**
   * No chat - process the user
   * */
  if (!context.chat) {
    return next();
  }

  /**
   * Handle forwarded messages from channel into channel's chat
   * */
  if (context.from?.id === TELEGRAM_FORWARD_USER_ID) {
    logSkipMiddleware(context, 'chat channel forward');
    return;
  }

  /**
   * Private user is not admin.
   * Bot should remove messages from private user messages.
   * */
  if (context.chat?.type === 'private') {
    return next();
  }

  /**
   * Skip channel admins message duplicated in chat
   * */
  if (context.chat?.type === 'channel') {
    logSkipMiddleware(context, 'channel chat type');
    return;
  }

  /**
   * Skip channel post when bot in channel
   * On message doesn't handle user posts
   * */
  if (context.update?.channel_post?.sender_chat?.type === 'channel') {
    logSkipMiddleware(context, 'channel');
    return;
  }

  /**
   * Anonymous users are always admins
   */
  if (context.from?.username === 'GroupAnonymousBot') {
    logSkipMiddleware(context, 'GroupAnonymousBot');
    return;
  }

  const fromId = context.from?.id;

  /**
   * If no id - not an admin
   * */
  if (!fromId) {
    return next();
  }

  /**
   * Check if the is admin. If so, skip.
   * */
  const chatMember = await context.getChatMember(fromId);
  if (['creator', 'administrator'].includes(chatMember.status)) {
    logSkipMiddleware(context, 'Admin');
    return;
  }

  /**
   * For public channels Telegram could send the message from channel as Channel_Bot.
   * It means an admin wrote the message, so we need to skip it.
   * https://github.com/42wim/matterbridge/issues/1654
   * */
  if (fromId === CHANNEL_BOT_ID || context.from?.username === 'Channel_Bot') {
    logSkipMiddleware(context, 'Channel_Bot');
    return;
  }

  /**
   * Sure not admin.
   * Either a regular chat user or private message.
   * */
  return next();
}
