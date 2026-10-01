// This module will be called if enabled in the config (severUptime.socket.enable = true)
/**
 * @example for connect to socket.io
 * view file ./connectSocketIO.example.js
 */
const { Server } = require("socket.io");
const { log, getText } = global.utils;
const { config } = global.GoatBot;

function randomToken(length) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let token = "";
	for (let i = 0; i < length; i++)
		token += chars.charAt(Math.floor(Math.random() * chars.length));
	return token;
}

module.exports = async (server) => {
	const socketConfig = config.serverUptime.socket;
	const { channelName } = socketConfig;
	let { verifyToken } = socketConfig;
	let io;

	try {
		if (!channelName)
			throw ('"channelName" is not defined in config');
		if (!verifyToken) {
			verifyToken = socketConfig.verifyToken = randomToken(32);
			log.warn("SOCKET IO", `"verifyToken" is not set in config, generated a temporary one: ${verifyToken}`);
			log.warn("SOCKET IO", "Set serverUptime.socket.verifyToken in config.json to a fixed value so clients can reconnect.");
		}
		io = new Server(server);
		log.info("SOCKET IO", getText("socketIO", "connected"));
	}
	catch (err) {
		return log.err("SOCKET IO", getText("socketIO", "error"), err);
	}

	io.on("connection", (socket) => {
		if (socket.handshake.query.verifyToken != verifyToken) {
			io.to(socket.id).emit(channelName, {
				status: "error",
				message: "Token is invalid"
			});
			socket.disconnect();
			return;
		}
		log.info("SOCKET IO", `New client connected to socket: ${socket.id}`);
		io.to(socket.id).emit(channelName, {
			status: "success",
			message: "Connected to server successfully"
		});
		socket.on("disconnect", () => {
			log.info("SOCKET IO", `Client disconnected from socket: ${socket.id}`);
		});
	});
};

