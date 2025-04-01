import PropTypes from "prop-types"

const TimeInRangeBar = ({ data, glucoseMin, glucoseMax }) => {
    const totalEntries = data.length
    const lowCount = data.filter((entry) => entry.glucose < glucoseMin).length
    const inRangeCount = data.filter(
        (entry) => entry.glucose >= glucoseMin && entry.glucose <= glucoseMax
    ).length
    const highCount = data.filter((entry) => entry.glucose > glucoseMax).length

    const lowPercentage = totalEntries ? (lowCount / totalEntries) * 100 : 0
    const inRangePercentage = totalEntries
        ? (inRangeCount / totalEntries) * 100
        : 0
    const highPercentage = totalEntries ? (highCount / totalEntries) * 100 : 0

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
            }}
        >
            <div
                style={{
                    width: "80px",
                    height: "210px",
                    borderRadius: "8px",
                    border: "3px solid #000000",
                    display: "flex",
                    flexDirection: "column-reverse",
                    alignItems: "center",
                    fontFamily: "Roboto",
                    textAlign: "center",
                    overflow: "hidden",
                    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.25)",
                }}
            >
                {/* Red segment for low glucose */}
                <div
                    data-testid="low-tir"
                    style={{
                        height: `${lowPercentage.toFixed(1)}%`,
                        width: "100%",
                        backgroundColor: "#B53A3A",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        color: "white",
                        fontSize: "25px",
                        fontWeight: "lighter",
                        borderBottomLeftRadius: "5px",
                        borderBottomRightRadius: "5px",
                    }}
                >
                    {lowPercentage > 0 ? `${lowPercentage.toFixed(0)}%` : ""}
                </div>

                {/* Green segment for in-range glucose */}
                <div
                    data-testid="in-range-tir"
                    style={{
                        height: `${inRangePercentage.toFixed(1)}%`,
                        width: "100%",
                        backgroundColor: "#3AA246",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        color: "white",
                        fontSize: "25px",
                        fontWeight: "bold",
                        borderBottomLeftRadius:
                            lowPercentage > 0 ? "0px" : "5px",
                        borderBottomRightRadius:
                            lowPercentage > 0 ? "0px" : "5px",
                        borderTopLeftRadius: highPercentage > 0 ? "0px" : "5px",
                        borderTopRightRadius:
                            highPercentage > 0 ? "0px" : "5px",
                    }}
                >
                    {inRangePercentage > 0
                        ? `${inRangePercentage.toFixed(0)}%`
                        : ""}
                </div>

                {/* Yellow segment for high glucose */}
                <div
                    data-testid="high-tir"
                    style={{
                        height: `${highPercentage.toFixed(1)}%`,
                        width: "100%",
                        backgroundColor: "#CBA63F",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        color: "white",
                        fontSize: "12px",
                        fontWeight: "lighter",
                        borderTopLeftRadius: "5px",
                        borderTopRightRadius: "5px",
                    }}
                >
                    {highPercentage > 0 ? `${highPercentage.toFixed(0)}%` : ""}
                </div>
            </div>
            <div
                style={{
                    textAlign: "center",
                    marginTop: "10px",
                    fontFamily: "Roboto",
                }}
            >
                <span style={{ fontSize: "1.2rem" }}>
                    <b>Time in range</b>
                </span>
                <br />
                <i>
                    <span style={{ fontSize: "0.9rem", color: "#737373" }}>
                        (past 24 hours)
                    </span>
                </i>
            </div>
        </div>
    )
}

TimeInRangeBar.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            timestamp: PropTypes.number.isRequired,
            glucose: PropTypes.number.isRequired,
        })
    ).isRequired,
    glucoseMin: PropTypes.number.isRequired,
    glucoseMax: PropTypes.number.isRequired,
}

export default TimeInRangeBar
