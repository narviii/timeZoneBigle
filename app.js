const Telegraf = require('telegraf')
const TelegrafLogger = require('telegraf-logger');
const dotenv = require('dotenv')
const session = require('telegraf/session');

const chrono = require('chrono-node')
dotenv.config();
const geoTz = require('geo-tz')
const { DateTime } = require("luxon");
const commandParts = require('telegraf-command-parts');
const googleMapsClient = require('@google/maps').createClient({
    key: process.env.GOOGLE_TOKEN,
    Promise: Promise
  }); 

const setTZ = require('set-tz')
setTZ('UTC')

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN)

const logger = new TelegrafLogger({
    //log: AwesomeLogger.log, // default: console.log
    // replace or remove placeholders as necessary
    format: '%ut => @%u %fn %ln (%fi): <%ust> %c', // default
    contentLength: 100, // default
  }); // All the default values can be omitted

bot.use(logger.middleware());  
bot.use(commandParts());




bot.use(session())

bot.start((ctx) => {
    ctx.reply(`Welcome to Time Bot. 
/help for the list of commands.
/time command followed by place to get local time for that place. Like /time tokyo
/my followed by name of the place you are in to set your location. Like /my vancouver
/what followed by time and name of the city and the time. Like /what 6pm tokyo and it will tell you what time will be at tokyo when it's 6pm in your location.`)
    
    })

bot.help((ctx) => {
    ctx.replyWithMarkdown(`/time followed by place to get local time for that place. Like /time tokyo
/my followed by name of the place you are in to set your location. Like /my vancouver
/what followed by time and name of the city and the time. Like /what 6pm tokyo and it will tell you what time will be at tokyo when it's 6pm in your location.`)
    
})

async function getZone(place) {
    const response = await googleMapsClient.geocode({address: place}).asPromise()
    //console.log(response)
    return geoTz(response.json.results[0].geometry.location.lat, response.json.results[0].geometry.location.lng)
}

bot.command('time', (ctx) => {
    //console.log(typeof(ctx.state.command.args))
    utcCheck =  ctx.state.command.splitArgs[0].toUpperCase()

    if ( utcCheck == 'UTC'||utcCheck == 'GMT') {
        ctx.reply(DateTime.local().toLocaleString(DateTime.DATETIME_HUGE)).catch((err)=>console.log(err))
        return
    }
    let response = googleMapsClient.geocode({address: ctx.state.command.args}).asPromise()
    response.then((response) => {
        tz = geoTz(response.json.results[0].geometry.location.lat, response.json.results[0].geometry.location.lng)

        locTime = DateTime.local().setZone(tz[0])
        
        //console.log(`${DateTime.utc().toISO()} : ${ctx.from.first_name} ${ctx.from.last_name} asked for time in ${tz[0]}: ${locTime.toLocaleString(DateTime.DATETIME_MED)}`)
        ctx.reply(`Local time in *${tz[0]}* timezone is *${locTime.toLocaleString(DateTime.TIME_SIMPLE)}* ${locTime.toLocaleString(DateTime.DATE_MED)}`,{parse_mode:'Markdown'}).catch((err)=>console.log(err))
        
    })
        .catch(() => {
            ctx.reply('Something gone wrong! Maybe wrong place?').catch((err)=>console.log(err))
        })
    

})

bot.on('location',(ctx)=>{
    ctx.session.location=ctx.message.location
    ctx.session.timezone = geoTz(ctx.session.location.latitude,ctx.session.location.longitude)
    ctx.reply(`Thanks ${ctx.from.first_name} for sharing your location. Your timezone is: ${ctx.session.timezone}`).catch((err)=>console.log(err))
})


bot.command('what',(ctx) => {
    splitArgs = ctx.state.command.splitArgs 
    argPlace = splitArgs.pop()
    argTime = splitArgs.join(' ')  
    if(ctx.session.timezone === undefined){
        ctx.replyWithMarkdown(`*${ctx.from.first_name}!* please tell me where you are with a /my command. Example : /my vancouver`).catch((err)=>console.log(err))
        return;
    }   
    try {  
        parsedTime=chrono.parse(argTime);
             
    } catch(err) {
        console.log(err)
        ctx.reply(`Didn't get it. Try /help for list of commands`)
        return
    }
    reqTime = DateTime.fromISO(parsedTime[0].start.date().toISOString()) 
    reqTimeRezoned =reqTime.setZone(ctx.session.timezone, { keepLocalTime: true });
    
    getZone(argPlace).then((tz) => {
        respTime = reqTimeRezoned.setZone(tz[0])
        a=respTime.toLocaleString(DateTime.TIME_SIMPLE)
        b=respTime.toLocaleString({ month: 'short', day: 'numeric' })
        c=reqTimeRezoned.toLocaleString(DateTime.TIME_SIMPLE)
        d=reqTimeRezoned.toLocaleString({ month: 'short', day: 'numeric' })
        ctx.replyWithHTML(`It is <b>${a}</b> ${b} in ${tz[0]} when it is <b>${c}</b> ${d} at ${ctx.session.timezone}`).catch((err)=>console.log(err))
        //ctx.reply(`It is *${respTime.toLocaleString(DateTime.TIME_SIMPLE)}* ${respTime.toLocaleString({ month: 'short', day: 'numeric' })} in ${tz[0]} when it is *${reqTimeRezoned.toLocaleString(DateTime.TIME_SIMPLE)}* ${reqTimeRezoned.toLocaleString({ month: 'short', day: 'numeric' })} at ${ctx.session.timezone}`,{parse_mode:'Markdown'})
    }).catch((err) => {
        console.log(err)
        ctx.reply(`Didn't get it. Try /help for list of commands`)
    })
    
})
bot.command('my',(ctx) =>{
    getZone(ctx.state.command.args)
        .then((tz) => {
        ctx.session.timezone=tz[0]
        ctx.reply(`*${ctx.from.first_name}!* Your time zone is set to: *${ctx.session.timezone}*`,{parse_mode:'Markdown'})
        }).catch(() => {
            ctx.reply('Something gone wrong! Maybe wrong place?')
        })
})




bot.launch()
console.log('Bot is running...')

