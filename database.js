db_loc = "./db.json"
const fs = require('fs');
encoding = "utf-8"

module.exports = {
    save: () => {
        try {
            fs.copyFileSync(db_loc, db_loc + ".old")
            fs.writeFileSync(db_loc, JSON.stringify(db), encoding)
            return true;
        } catch (err) {
            return false;
        }
    }, load: () => {
        try {
            fs.accessSync(db_loc, fs.constants.R_OK)
        } catch (err) {
            db = { secret: require('crypto').randomBytes(48).toString('hex'), javas: ["java"] }
            fs.writeFileSync(db_loc, JSON.stringify(db), encoding, err => {
                if (err) throw err;
            })
        }
        try {
            return JSON.parse(fs.readFileSync(db_loc, encoding))
        } catch (err) {
            console.log("Database seems broken! Aborting...")
            throw err
        }
    }
};