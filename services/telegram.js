if(process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'development';
}
const banco = require('../services/banco');
const config = require('../services/config').mountConfig();

module.exports = {
  async createRaffle(ctx) {
    if(ctx.update.message && ctx.update.message.reply_to_message) {
      const mongoDb = await banco.abrirConexaoMongo(config);
      const db = mongoDb.db(config.mongo.dbName);
      const raffles = await db.collection('raffles');

      const options = { reply_markup: { inline_keyboard: [[{text:'Join', callback_data: `join`}]], resize_keyboard:true}};
      const message = await ctx.reply(ctx.update.message.text, options);
  
      const raffle = await raffles.insertOne({id: message.message_id, chat: ctx.update.message.chat.id, title: message.text, participants:[]});
      ctx.scene.leave()

      await banco.fecharConexaoMongo(mongoDb);
    } else {
      ctx.reply('Você esqueceu de dar reply na Mensagem 🙄');
    }

  },
  async listRaffles(ctx) {
    const mongoDb = await banco.abrirConexaoMongo(config);
    const db = mongoDb.db(config.mongo.dbName);
    const raffles = await db.collection('raffles');
    const raffleList = await raffles.find({ chat: ctx.message.chat.id }).toArray();

    if(raffleList.length > 0) {
      const message = 'Raffles:';
      const options = { reply_markup: { inline_keyboard: [], resize_keyboard:true}};
      const inlines = []
      for (const raffle of raffleList) {
        inlines.push({text:raffle.title, callback_data: raffle.title})
      }
      options.reply_markup.inline_keyboard.push(inlines)
      ctx.reply(message, options);
    }else {
      ctx.reply('No new Raffles')
    }
    await banco.fecharConexaoMongo(mongoDb);

  },
  async finishRaffle(ctx) {
    const mongoDb = await banco.abrirConexaoMongo(config);
    const db = mongoDb.db(config.mongo.dbName);
    const raffles = await db.collection('raffles');
    const raffleList = await raffles.find({ chat: ctx.message.chat.id }).toArray();

    if(raffleList.length > 0) {
      const message = 'Raffles:';
      const options = { reply_markup: { inline_keyboard: [], resize_keyboard:true}};
      const inlines = []
      for (const raffle of raffleList) {
        inlines.push({text:raffle.title, callback_data: raffle.title + `$$END`})
      }
      options.reply_markup.inline_keyboard.push(inlines)
      ctx.reply(message, options);
    }else {
      ctx.reply('No new Raffles')
    }
    await banco.fecharConexaoMongo(mongoDb);

  },
  async enterMessage(ctx) {
    await ctx.reply('enter the Raffle title\n(Reply this Message)');
  },
  async callbackMiddleware(ctx) {
    const data = ctx.callbackQuery.data;
    switch(true) {
      case data.includes('join'):
        join(ctx)
      break;
      case data.includes('$$END'):
        result(ctx)
      break;
      default:
        seeRaffle(ctx)
      break;
    }
  },
  dropTemp,
  seeRaffle
}

async function result(ctx) {
  const mongoDb = await banco.abrirConexaoMongo(config);
  const db = mongoDb.db(config.mongo.dbName);
  const raffles = await db.collection('raffles');

  const message = (ctx.callbackQuery.data.split('$$END'))[0];
  const chatId = ctx.update.callback_query.message.chat.id;

  const raffle = await raffles.findOne({ title: message, chat: chatId });
  const randomParticipant = raffle.participants[Math.floor(Math.random() * raffle.participants.length)];
  ctx.reply(`Winner @${randomParticipant}`);
}
async function seeRaffle(ctx) {
  const mongoDb = await banco.abrirConexaoMongo(config);
  const db = mongoDb.db(config.mongo.dbName);
  const raffles = await db.collection('raffles');

  const message = ctx.callbackQuery.data;
  const chatId = ctx.update.callback_query.message.chat.id;

  const raffle = await raffles.findOne({ title: message, chat: chatId });
  ctx.reply(`${raffle.participants.length} registered`);
  await banco.fecharConexaoMongo(mongoDb);
}

async function join(ctx) {
  const mongoDb = await banco.abrirConexaoMongo(config);
  const db = mongoDb.db(config.mongo.dbName);
  const raffles = await db.collection('raffles');

  const messageId = ctx.callbackQuery.message.message_id;
  const callbackId = ctx.callbackQuery.id;
  const username = ctx.callbackQuery.from.username;

  const raffle = await raffles.findOne({ id: messageId });
  if(raffle.participants.indexOf(username)) {
    const update = await raffles.updateOne({ id: messageId }, { $push: { participants: username }});
    if(update.result.ok === 1) {
      await ctx.telegram.answerCbQuery(callbackId, 'Registration Accepted', false);
    } 
  } else {
    await ctx.telegram.answerCbQuery(callbackId, 'You are already registered', false);
  } 
  await banco.fecharConexaoMongo(mongoDb);
}
async function dropTemp(ctx) {
  if(ctx.message.text === 'exit') {
    await ctx.editMessageReplyMarkup();
  }
  ctx.reply('Raffle Canceled');
  ctx.scene.leave();
}