const { getStartMessage, getGroupStartMessage, makeAdminMessage, startAdminReadyMessage } = require('../../message');
const { handleError, telegramUtil } = require('../../utils');

class StartMiddleware {
  /**
   * @param {Bot} bot
   * */
  constructor(bot) {
    this.bot = bot;
  }

  /**
   * Handle /start
   * Returns help message
   *
   * */
  middleware() {
    /**
     * @param {GrammyContext} ctx
     * */
    return (ctx) => {
      if (ctx.chat.type === 'private') {
        return ctx.replyWithHTML(getStartMessage());
      }

      if (ctx.session.isBotAdmin) {
        return ctx.replyWithHTML(startAdminReadyMessage);
      }

      telegramUtil.getChatAdmins(this.bot, ctx.chat.id).then(({ adminsString }) => {
        ctx.replyWithHTML(getGroupStartMessage({ adminsString })).catch((getAdminsError) => {
          handleError(getAdminsError);
          ctx.replyWithHTML(makeAdminMessage);
        });
      });
    };
  }
}

module.exports = {
  StartMiddleware,
};
