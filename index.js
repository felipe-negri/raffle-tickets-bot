const config = require('./services/config').mountConfig();
const {enterMessage, dropTemp, createRaffle, callbackMiddleware, listRaffles, finishRaffle } = require('./services/telegram');

const { Telegraf } = require('telegraf')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base');

const raffle = new Scene('raffle')
raffle.enter(enterMessage)
raffle.command('exit',dropTemp)
raffle.on('message',createRaffle)

// Create scene manager
const stage = new Stage()
stage.register(raffle)

const bot = new Telegraf(config.bot.id)
bot.use(session())
bot.use(stage.middleware())
bot.command('createRaffle', (ctx) => ctx.scene.enter('raffle'));
bot.command('listRaffles', listRaffles)
bot.command('finishRaffle', finishRaffle)
bot.on('callback_query', callbackMiddleware);
bot.startPolling()


