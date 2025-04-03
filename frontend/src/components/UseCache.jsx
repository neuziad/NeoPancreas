import db from "../db"

const cacheGlucoseReading = async (reading) => {
    await db.glucoseReadings.put({
        timestamp: reading.timestamp,
        value: reading.reading,
        trend: reading.trend,
    })
}

const retrieveCacheReadings = async () => {
    return await db.glucoseReadings.toArray()
}

const cacheUserInfo = async (user) => {
    await db.tokens.put({
        id: user.id,
        access_token: user.access_token,
        refresh_token: user.refresh_token,
        expiry: user.expiry,
        first_name: user.first_name,
        last_name: user.last_name,
    })
}

const retrieveUserInfo = async () => {
    return await db.tokens.toArray()
}

const cacheUserProfile = async (profileData) => {
    if (!profileData.id) {
        console.error(
            "❌ IndexedDB Error: Profile missing `id` field:",
            profileData
        )
        return
    }

    try {
        await db.userProfile.put(profileData)
        console.log("✅ User profile cached:", profileData)
    } catch (error) {
        console.error("❌ Error caching user profile:", error)
    }
}

const retrieveUserProfile = async () => {
    return await db.userProfile.toArray()
}

export {
    cacheGlucoseReading,
    retrieveCacheReadings,
    cacheUserInfo,
    retrieveUserInfo,
    cacheUserProfile,
    retrieveUserProfile,
}
