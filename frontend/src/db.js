import Dexie from "dexie"

const db = new Dexie("NeoPancreas")
db.version(1).stores({
    glucoseReadings: "++id, timestamp, value, trend",
    tokens: "&id, access_token, refresh_token, expiry, first_name, last_name",
    userProfile:
        "&id, glucoseMin, glucoseMax, glucoseTarget, basalRate, emEnabled, carbRatio, correctionFactor, iob, bolusMax, diabeticProfile, maxIOB, insulinDuration",
})

export default db
