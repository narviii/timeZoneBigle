const Telegraf = require('telegraf')
const dotenv = require('dotenv')
dotenv.config();
const geoTz = require('geo-tz')
const { DateTime } = require("luxon");
const commandParts = require('telegraf-command-parts');
const googleMapsClient = require('@google/maps').createClient({
    key: process.env.GOOGLE_TOKEN,
    Promise: Promise
  }); 
  
//geoTz.preCache()
dotenv.config();

console.log(process.env.BOT_TOKEN)

const bot = new Telegraf(process.env.BOT_TOKEN)
bot.use(commandParts());

bot.start((ctx) => {
    //console.log(ctx.message)
    ctx.reply('Welcome to Time Bot. Type /time command followed by place to get local time for that place. Try "/time tokyo"');
    })

bot.help((ctx) => {
    ctx.reply('/time command followed by place to get local time for that place. Try "/time tokyo')
})

bot.command('time', (ctx) => {
    //console.log(typeof(ctx.state.command.args))
    let response = googleMapsClient.geocode({address: ctx.state.command.args}).asPromise()
    response.then((response) => {
        tz = geoTz(response.json.results[0].geometry.location.lat, response.json.results[0].geometry.location.lng)
        //console.log(tz)
        //console.log(ctx.from)
        locTime = DateTime.local().setZone(tz[0])
        
        console.log(`${ctx.from.first_name} ${ctx.from.last_name} asked for time in ${tz[0]}: ${locTime.toLocaleString(DateTime.DATETIME_MED)}`)
        ctx.reply(`Local time in ${tz[0]} timezone is ${locTime.toLocaleString(DateTime.DATETIME_MED)}`)
        
    })
        .catch(() => {
            ctx.reply('Something gone wrong! Maybe wrong place?')
        })
    //console.log(ctx.state.command)
    //ctx.reply('Hello')
})

bot.launch()

