const cron = require('node-cron');
console.log('CRONS ATIVADOS');

const config = require('./services/config').mountConfig();

const banco = require('./services/banco');
const {  deleteCron } = config.cron;

cron.schedule(deleteCron, () => {
    const mongoDb = await banco.abrirConexaoMongo(config);
    const db = await mongoDb.db(config.mongo.dbName);
    await banco.delFinished(db);
    await banco.fecharConexaoMongo(mongoDb);
}, {
  scheduled: true,
  timezone: "America/Sao_Paulo"
});
