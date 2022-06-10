const fs = require("fs");
const express = require("express");
const discord = require("discord.js");
const {
	REST
} = require("@discordjs/rest");
const {
	Routes
} = require('discord-api-types/v10');
const {
	SlashCommandBuilder
} = require("@discordjs/builders")
const app = express();
const config = require("./config.json")
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database('bans.db');
const hook = new discord.WebhookClient({
	url: config.webhook
})
const bot = new discord.Client({
	intents: []
})
db.run(fs.readFileSync("./blank.sql").toString()) // Generate table if not exist

app.get("/check", async (req, res) => {
	if (!req.query.id) return res.sendStatus(400).end();
	db.all("SELECT * FROM bans WHERE id = ?", req.query.id, (err, rows) => {
		if (err) return res.sendStatus(500).end();
		if (rows[0]) {
			data = {
				id: req.query.id,
				ban: true
			}
			res.status(200).send(data).end();
		} else {
			data = {
				id: req.query.id,
				ban: false,
				data: rows[0]
			}
			res.status(200).send(data).end();
		}
	});
})
app.get("/ban", async (req, res) => {
	if (!req.query.auth) return res.sendStatus(400).end();
	if (req.query.auth !== config.security) return res.sendStatus(401).end();
	data = JSON.parse(req.query.data)
	db.run("INSERT INTO bans VALUES (?,?,?,?)", data.id, data.username, data.mod, data.reason ? data.reason : "None Given", (err, row) => {
		if (err) {
			return res.status(500).send(err).end();
		}
		hook.send({
			embeds: [{
				title: "Ban Added",
				timestamp: new Date(),
				color: 16711680,
				fields: [{
						name: "Moderator",
						value: data.mod,
						inline: true
					},
					{
						name: "Username",
						value: data.username ? data.username : "Unknown",
						inline: true
					},
					{
						name: "Steam ID",
						value: data.id,
						inline: true
					},
					{
						name: "Reason",
						value: data.reason ? data.reason : "None Given",
						inline: true
					}
				]
			}]
		})
		res.status(200).send(row).end();
	})
})

app.get("/unban", async (req, res) => {
	if (!req.query.auth) return res.sendStatus(400).end();
	if (req.query.auth !== config.security) return res.sendStatus(401).end();
	db.run("DELETE FROM bans WHERE id = ?", req.query.id, (err, row) => {
		if (err) return res.status(500).send(err).end();
		hook.send({
			embeds: [{
				title: "Ban Removed",
				timestamp: new Date(),
				color: 65280,
				fields: [{
					name: "Steam ID",
					value: data.id,
					inline: true
				}]
			}]
		})
		res.status(200).send(row).end();
	})
})


bot.once("ready", async () => {
	console.info(`Logged in as ${bot.user.tag}`);
	const commands = [];
	const slashCommandData = [
		new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Ban a steam ID from the Stormworks server(s)')
		.addIntegerOption((option) =>
			option.setName("steam64").setDescription("The steam ID to ban").setRequired(true)
		)
		.addStringOption((option) =>
			option.setName("reason").setDescription("Reason for the ban")
		)
		.setDefaultMemberPermissions(4),
		new SlashCommandBuilder()
		.setName('unban')
		.setDescription('Unban a steam ID from the Stormworks server(s)')
		.addIntegerOption((option) =>
			option.setName("steam64").setDescription("The steam ID to unban").setRequired(true)
		)
		.setDefaultMemberPermissions(4)

	];
	slashCommandData.forEach((command) => {
		commands.push(command.toJSON());
	});
	const rest = new REST().setToken(config.token);
	rest.put(Routes.applicationCommands(bot.user.id), {
			body: commands
		})
		.then(() => console.log('Successfully registered application commands.'))
		.catch(console.error);
})

bot.on("interactionCreate", async (interaction) => {
	if(!interaction.isApplicationCommand()) return;
	switch (interaction.commandName) {
		case "ban":
			let reason = interaction.options.getString('reason')
			db.run("INSERT INTO bans VALUES (?,?,?,?)", interaction.options.getInteger("steam64"), "Unknown", interaction.user.username, reason ? reason : "None Given", (err, row) => {
				if (err) {
					interaction.editReply({
						ephemeral: true
					}, "An error occurred!");
				}
				hook.send({
					embeds: [{
						title: "Ban Added",
						timestamp: new Date(),
						color: 16711680,
						fields: [{
								name: "Moderator",
								value: interaction.user.username,
								inline: true
							},
							{
								name: "Username",
								value: "Unknown",
								inline: true
							},
							{
								name: "Steam ID",
								value: interaction.options.getInteger("steam64").toString(),
								inline: true
							},
							{
								name: "Reason",
								value: reason ? reason : "None Given",
								inline: true
							}
						]
					}]
				})
				interaction.reply({
					ephemeral: true,
					content: `Banned ${interaction.options.getInteger("steam64")}`
				})
			})
			break;
		case "unban":
			db.run("DELETE FROM bans WHERE id = ?", interaction.options.getInteger("steam64"), (err, row) => {
				if (err) return interaction.reply({
					ephemeral: true,
					content: `Failed to unban ${interaction.options.getInteger("steam64")}`
				})
				hook.send({
					embeds: [{
						title: "Ban Removed",
						timestamp: new Date(),
						color: 65280,
						fields: [{
							name: "Steam ID",
							value: interaction.options.getInteger("steam64").toString(),
							inline: true
						}]
					}]
				})
				interaction.reply({
					ephemeral: true,
					content: `Unbanned ${interaction.options.getInteger("steam64")}`
				})
			})
			break;
	}
})

bot.login(config.token)

app.listen(config.port, config.hostname, () => {
	console.log("server started");
})