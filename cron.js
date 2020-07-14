const cron = require('node-cron');
console.log('CRONS ATIVADOS');

const banco = require('./services/banco');

cron.schedule('0 1 * * 0', async () => {
    const config = require('./services/config').mountConfig();
    const mongoDb = await banco.abrirConexaoMongo(config);
    const db = await mongoDb.db(config.mongo.dbName);
    await banco.delFinished(db);
    await banco.fecharConexaoMongo(mongoDb);
}, {
  scheduled: true,
  timezone: "America/Sao_Paulo"
});
