import db from "../db"

const cacheGlucoseReading = async (reading) => {
    await db.glucoseReadings.put({
        timestamp: reading.timestamp,
        value: reading.reading,
    })
}

const retrieveCacheReadings = async () => {
    return await db.glucoseReadings.toArray()
}

export { cacheGlucoseReading, retrieveCacheReadings }
