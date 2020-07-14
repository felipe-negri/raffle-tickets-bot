if(process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'development';
}
const banco = require('../services/banco');
const { ObjectID } = require('mongodb');
const config = require('../services/config').mountConfig();

module.exports = {
  async createRaffle(ctx) {
    if(ctx.update.message && ctx.update.message.reply_to_message) {
      const replyMessageId = ctx.update.message.reply_to_message.message_id;
      const message =  ctx.update.message.text;
      const messageId = ctx.update.message.message_id;

      const mongoDb = await banco.abrirConexaoMongo(config);
      const db = mongoDb.db(config.mongo.dbName);
      const raffles = await db.collection('raffles');
      const temporario = await banco.obterTemporario(replyMessageId, db);

      temporario.ids.push(messageId);
      const { stage } = temporario;

      switch(stage) {
        case 1:
          const r1 = await ctx.reply('Raffle Title Successfully Registered :3\nNow reply with the channel with @');
          temporario.titulo = message;
          temporario.user = {id: ctx.update.message.from.id, username:'@' + ctx.update.message.from.username }
          temporario.ids.push(r1.message_id);
          console.log(temporario.ids)
          temporario.stage = 2;
          
          await banco.atualizarTemp(temporario, db);
         
        break;
        case 2:
          if(message.includes('@')) {
            const r2 = await ctx.reply('Channel Registred Successful :3\nSending Raffle...');
            const canal = message;
            const titulo = temporario.titulo;
            const options = { reply_markup: { inline_keyboard: [[{text:'Join', callback_data: `join`}]], resize_keyboard:true}};
            const raffle = await ctx.telegram.sendMessage(canal, titulo, options);
            const insert = await raffles.insertOne({user: temporario.user, message: {id: raffle.message_id}, channel: {id: raffle.chat.id, nome: canal}, title: titulo, participants:[]});
            if(insert.insertedCount === 1) {
              ctx.reply('Raffle Send Successful');
              await banco.delTemp(db, temporario);
            } else {
              ctx.reply(`Error to Send The Raffle`)
            }
          } else {
            const reply = await ctx.reply('You Forget @ on user Channel');
            temporario.titulo = message;
            temporario.ids.push(reply.message_id);
            console.log(temporario.ids)
            await banco.atualizarTemp(temporario, db);
          }
          ctx.scene.leave()
        break;
      }
  
      await banco.fecharConexaoMongo(mongoDb);
    } else {
      const replyMiss = await ctx.reply('You forgot to reply to the message 🙄');
      temporario.titulo = message;
      temporario.ids.push(replyMiss.message_id);
      console.log(temporario.ids)
      await banco.atualizarTemp(temporario, db);
      await banco.fecharConexaoMongo(mongoDb);
    }

  },
  async listRaffles(ctx) {
    const mongoDb = await banco.abrirConexaoMongo(config);
    const db = mongoDb.db(config.mongo.dbName);
    const raffles = await db.collection('raffles');
    const raffleList = await raffles.find({ 'user.id': ctx.message.from.id }).toArray();

    if(raffleList.length > 0) {
      let message = 'Raffles:';
      for (const raffle of raffleList) {
        message = message + `\n${raffle.title} \nParticipants: ${raffle.participants.length}`
      }
      ctx.reply(message);
    }else {
      ctx.reply('No new Raffles')
    }
    await banco.fecharConexaoMongo(mongoDb);

  },
  async finishMessage(ctx) {
    const mongoDb = await banco.abrirConexaoMongo(config);
    const db = mongoDb.db(config.mongo.dbName);
    const raffles = await db.collection('raffles');
    const raffleList = await raffles.find({ 'user.id': ctx.message.from.id }).toArray();

    if(raffleList.length > 0) {
      const message = 'Select a Raffle to draw the winner:';
      const options = { reply_markup: { inline_keyboard: [], resize_keyboard:true}};
      const inlines = []
      for (const raffle of raffleList) {
        inlines.push({text:raffle.title, callback_data: raffle.title + `$$END`})
      }
      options.reply_markup.inline_keyboard.push(inlines);
      ctx.reply(message, options);
    } else {
      ctx.reply('No new Raffles use /create to create a new Raffle');
    }
    await banco.fecharConexaoMongo(mongoDb);

  },
  async enterMessage(ctx) {
    const mongoDb = await banco.abrirConexaoMongo(config);
    const db = mongoDb.db(config.mongo.dbName);

    const enterMessage = await ctx.reply('Enter the Raffle title\nSend /exit to cancel\n(Reply this Message)');
    await banco.inicializarTemp(enterMessage,1 , db)
    await banco.fecharConexaoMongo(mongoDb);
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
      case data.includes('$$DEL'):
        deleteRaffle(ctx)
      break;
      default:
        seeRaffle(ctx)
      break;
    }
  },
  async deleteMessage(ctx) {
    const mongoDb = await banco.abrirConexaoMongo(config);
    const db = mongoDb.db(config.mongo.dbName);
    const raffles = await db.collection('raffles');
    const raffleList = await raffles.find({ 'user.id': ctx.message.from.id }).toArray();

    if(raffleList.length > 0) {
      const message = 'Select a Raffle to delete:';
      const options = { reply_markup: { inline_keyboard: [], resize_keyboard:true}};
      const inlines = []
      for (const raffle of raffleList) {
        inlines.push({text:raffle.title, callback_data: raffle.title + `$$DEL`})
      }
      options.reply_markup.inline_keyboard.push(inlines);
      ctx.reply(message, options);
    } else {
      ctx.reply('No new Raffles use /create to create a new Raffle');
    }
    await banco.fecharConexaoMongo(mongoDb);
  },
  async start(ctx){
    await ctx.replyWithVideo(config.startVideoId);
  },
  dropTemp,
  seeRaffle
}

async function deleteRaffle(ctx) {
  const mongoDb = await banco.abrirConexaoMongo(config);
  const db = mongoDb.db(config.mongo.dbName);
  const raffles = await db.collection('raffles');

  const message = (ctx.callbackQuery.data.split('$$DEL'))[0];
  const userId = ctx.update.callback_query.message.chat.id;

  const del = await raffles.deleteOne({ title: message, 'user.id': userId });
  if(del.deletedCount){
    ctx.reply('Raffle Deleted Sucessfull');
  }
}
async function result(ctx) {
  const mongoDb = await banco.abrirConexaoMongo(config);
  const db = mongoDb.db(config.mongo.dbName);
  const raffles = await db.collection('raffles');

  const message = (ctx.callbackQuery.data.split('$$END'))[0];
  const userId = ctx.update.callback_query.message.chat.id;

  const raffle = await raffles.findOne({ title: message, 'user.id': userId });
  if(raffle.participants.length > 0) {
    const randomParticipant = raffle.participants[Math.floor(Math.random() * raffle.participants.length)];
    await ctx.telegram.sendMessage(raffle.channel.id,`${raffle.title}\nWinner @${randomParticipant}`);
    await ctx.reply('Winner Send To The Channel')
    await raffles.updateOne({_id: ObjectID(raffle._id)},{$set:{winner:randomParticipant}})
  } else {
    ctx.reply(`No Participants`)
  }
  await banco.fecharConexaoMongo(mongoDb);
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
  const channelId = ctx.callbackQuery.message.chat.id
  const callbackId = ctx.callbackQuery.id;
  const username = ctx.callbackQuery.from.username;

  const raffle = await raffles.findOne({ 'message.id': messageId, 'channel.id': channelId  });
  if(raffle.winner){
    await ctx.telegram.answerCbQuery(callbackId, 'Raffle is Over :c', false);
  } else {
    if(raffle.participants.indexOf(username)) {
      const update = await raffles.updateOne({ 'message.id': messageId, 'channel.id': channelId }, { $push: { participants: username }});
      if(update.result.ok === 1) {
        await ctx.telegram.answerCbQuery(callbackId, 'Registration Accepted', false);
      } 
    } else {
      await ctx.telegram.answerCbQuery(callbackId, 'You are already registered', false);
    } 
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