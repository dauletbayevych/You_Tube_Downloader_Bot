const ytdl = require("ytdl-core");
const { Telegraf, Markup } = require("telegraf");

const vids = {};
const formats = {
    360: "134",
    480: "135",
    720: "136",
    1080: "137",
    audio: "251",
};

const getVideoInfo = async (url) => {
    if (ytdl.validateURL(url)) {
        const info = await ytdl.getInfo(url);
        return info;
    } else {
        throw new Error("Invalid URL");
    }
};

const formatVideoInfo = ({ videoDetails }) => {
    const videoInfo = {
        title: videoDetails.title,
        lengthSeconds: (+videoDetails.lengthSeconds / 60).toFixed(1),
    };
    return `
        ❇️ *Title:* ${videoInfo.title}\n\n✅ *Duration:* ${videoInfo.lengthSeconds} minutes
    `;
};

const getQuality = ({ formats }, quality) => {
    return ytdl.chooseFormat(formats, { quality });
};

const downloadVideo = (url, options) => {
    const stream = ytdl(url, {
        ...options,
    });
    return stream;
};

const parseId = (ctx) => {
    return ctx.match[0].split("-")[1];
};

const bot = new Telegraf("5895872462:AAGqVskpssuUx5DOYJMZkdyEiH9kxJSs5uw");
bot.start((ctx) => {
    ctx.reply("🪁 Welcome\n=============\n🖼️ Paste your YouTube URL in the textbox.");
});

bot.on("message", async (ctx) => {
    ctx.reply("*Processing your video*", { parse_mode: "MarkdownV2" });
    try {
        const url = ctx.update.message.text;
        const info = await getVideoInfo(url);
        info.$url = url;
        ctx.reply(formatVideoInfo(info), { parse_mode: "Markdown" });
        const id = ctx.update.message.from.id;
        vids[id] = info;
        ctx.reply("📼 Choose Quality:", Markup.inlineKeyboard([Markup.button.callback(`360`, `set360p-${id}`), Markup.button.callback(`480`, `set480p-${id}`), Markup.button.callback(`720`, `set720p-${id}`), Markup.button.callback(`1080`, `set180p-${id}`)]));
    } catch (e) {
        console.log(e);
        ctx.reply("🚫 Something went wrong. Please try again.");
    }
});

const handleAction = async (ctx, id, quality) => {
    try {
        const info = vids[id];
        if (!info) throw new Error("Video not found");
        const mappedFormat = formats[quality];
        let format = getQuality(info, mappedFormat);
        ctx.reply(`OK. downloading your file now... please wait.`);
        const stream = downloadVideo(info.$url, { format });
        ctx.replyWithVideo({
            source: stream,
            filename: info.videoDetails.title,
        });
        stream.on("end", () => {
            delete vids[id];
        });
    } catch (e) {
        console.log(e);
        if (e.message === "Video not found") {
            ctx.reply("🚫 you already downloaded this video.");
        } else {
            ctx.reply(`🚫 quality: ${quality} is not avaiable.`);
        }
        await ctx.answerCbQuery();
    }
};

bot.action(/^[set360p]+-([0-9]+)?$/, (ctx) => {
    const id = parseId(ctx);
    handleAction(ctx, id, 360);
});
bot.action(/^[set480p]+-([0-9]+)?$/, async (ctx) => {
    const id = parseId(ctx);
    handleAction(ctx, id, 480);
});
bot.action(/^[set720p]+-([0-9]+)?$/, async (ctx) => {
    const id = parseId(ctx);
    handleAction(ctx, id, 720);
});
bot.action(/^[set1080p]+-([0-9]+)?$/, async (ctx) => {
    const id = parseId(ctx);
    handleAction(ctx, id, 1080);
});

bot.launch();
