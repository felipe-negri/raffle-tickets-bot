console.log(`BOT START`)
const config = require('./services/config').mountConfig();
const { enterMessage, dropTemp, createRaffle, callbackMiddleware, listRaffles, deleteMessage, finishMessage, start } = require('./services/telegram');

const { Telegraf } = require('telegraf')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base');

const raffle = new Scene('raffle')
raffle.enter(enterMessage)
raffle.command('exit',dropTemp)
raffle.on('message',createRaffle)

const stage = new Stage()
stage.register(raffle)

const bot = new Telegraf(config.bot.id)
bot.use(session())
bot.use(stage.middleware())
bot.command('create', (ctx) => ctx.scene.enter('raffle'));
bot.command('finish', finishMessage);
bot.command('list', listRaffles);
bot.command('delete', deleteMessage)
// bot.command('start', start);
bot.on('callback_query', callbackMiddleware);
bot.launch()

