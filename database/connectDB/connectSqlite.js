module.exports = async function () {
	const { Sequelize } = require("sequelize");
	const fs = require("fs");
	// Allow overriding the database location (e.g. when the project directory
	// lives on a network filesystem such as NFS, where SQLite cannot take file
	// locks). Defaults to the project's database/data/data.sqlite file.
	const path = process.env.GOAT_DB_PATH || (__dirname + "/../data/data.sqlite");
	const sequelize = new Sequelize({
		dialect: "sqlite",
		host: path,
		logging: false,
		dialectOptions: {
			// Reduce "database is locked" failures by waiting for the lock
			// instead of erroring immediately.
			busyTimeout: 10000
		}
	});

	const threadModel = require("../models/sqlite/thread.js")(sequelize);
	const userModel = require("../models/sqlite/user.js")(sequelize);
	const dashBoardModel = require("../models/sqlite/userDashBoard.js")(sequelize);
	const globalModel = require("../models/sqlite/global.js")(sequelize);

	await sequelize.sync({ force: false });

	return {
		threadModel,
		userModel,
		dashBoardModel,
		globalModel,
		sequelize
	};
};
