const Telegraf = require('telegraf')
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
bot.use(commandParts());
bot.use(session())

bot.start((ctx) => {
    ctx.reply('Welcome to Time Bot. Type /time command followed by place to get local time for that place. Try "/time tokyo"');
    
    })

bot.help((ctx) => {
    ctx.reply('/time command followed by place to get local time for that place. Try /time tokyo')
})

async function getZone(place) {
    const response = await googleMapsClient.geocode({address: place}).asPromise() 
    return geoTz(response.json.results[0].geometry.location.lat, response.json.results[0].geometry.location.lng)
}

bot.command('time', (ctx) => {
    //console.log(typeof(ctx.state.command.args))
    utcCheck =  ctx.state.command.splitArgs[0].toUpperCase()

    if ( utcCheck == 'UTC'||utcCheck == 'GMT') {
        ctx.reply(DateTime.local().toLocaleString(DateTime.DATETIME_HUGE))
        return
    }
    let response = googleMapsClient.geocode({address: ctx.state.command.args}).asPromise()
    response.then((response) => {
        tz = geoTz(response.json.results[0].geometry.location.lat, response.json.results[0].geometry.location.lng)

        locTime = DateTime.local().setZone(tz[0])
        
        console.log(`${DateTime.utc().toISO()} : ${ctx.from.first_name} ${ctx.from.last_name} asked for time in ${tz[0]}: ${locTime.toLocaleString(DateTime.DATETIME_MED)}`)
        ctx.reply(`Local time in *${tz[0]}* timezone is *${locTime.toLocaleString(DateTime.TIME_SIMPLE)}* ${locTime.toLocaleString(DateTime.DATE_MED)}`,{parse_mode:'Markdown'})
        
    })
        .catch(() => {
            ctx.reply('Something gone wrong! Maybe wrong place?')
        })
    

})

bot.on('location',(ctx)=>{
    ctx.session.location=ctx.message.location
    ctx.session.timezone = geoTz(ctx.session.location.latitude,ctx.session.location.longitude)
    ctx.reply(`Thanks ${ctx.from.first_name} for sharing your location. Your timezone is: ${ctx.session.timezone}`)
})


bot.command('what',(ctx) => {
    splitArgs = ctx.state.command.splitArgs
    
    argPlace = splitArgs.pop()
    argTime = splitArgs.join(' ')
    
    if(ctx.session.timezone === undefined){
        ctx.reply(`Please tell me where you are with a /my command. Example : /my vancouver`)
        return
    }
    
    try {  
        parsedTime=chrono.parse(argTime)
        
        
    }catch{
        ctx.reply(`Didn't get it. Try /help for list of commands`)
        return
    }
    
    
    //a = parsedTime[0].start.date().toISOString()
    //console.log(a)
    //stripedTime = a//.substring(0,19) // striping TZ info(last digits) from ISO string to get time which user asks for
    console.log(DateTime.local().toLocaleString(DateTime.DATETIME_HUGE))
    reqTime = DateTime.fromISO(parsedTime[0].start.date().toISOString()) //adding TZ info which user stated
    reqTimeRezoned =reqTime.setZone(ctx.session.timezone, { keepLocalTime: true });
    getZone(argPlace).then((tz) => {
        ctx.reply(`It is *${reqTimeRezoned.setZone(tz[0]).toLocaleString(DateTime.TIME_SIMPLE)}* ${reqTimeRezoned.setZone(tz[0]).toLocaleString(DateTime.DATE_MED)} in ${tz[0]} when it is *${reqTimeRezoned.toLocaleString(DateTime.TIME_SIMPLE)}* ${reqTimeRezoned.toLocaleString(DateTime.DATE_MED)} at ${ctx.session.timezone}`,{parse_mode:'Markdown'})
    }).catch(() => {
        ctx.reply(`Didn't get it. Try /help for list of commands`)
    })
    
})
bot.command('my',(ctx) =>{
    getZone(ctx.state.command.args)
        .then((tz) => {
        ctx.session.timezone=tz[0]
        ctx.reply(`Your timezone is set to: *${ctx.session.timezone}*`,{parse_mode:'Markdown'})
        }).catch(() => {
            ctx.reply('Something gone wrong! Maybe wrong place?')
        })
})



bot.launch()
console.log('Bot is running...')

