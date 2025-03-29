import Dexie from "dexie"

const db = new Dexie("NeoPancreas")
db.version(1).stores({
    glucoseReadings: "++id, timestamp, value",
    tokens: "&id, access_token, refresh_token, expiry",
})

export default db
