import PropTypes from 'prop-types'

const TimeInRangeBar = ({ data, glucoseMin = 3.9, glucoseMax = 11 }) => {
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
                display: 'flex',
            }}
        >
            <div
                style={{
                    width: '35%',
                    height: '30px',
                    borderRadius: '8px',
                    border: '3px solid #000000',
                    display: 'flex',
                    alignItems: 'center',
                    fontFamily: 'Roboto',
                    textAlign: 'center',
                }}
            >
                {/* Red segment for low glucose */}
                <div
                    style={{
                        width: `${lowPercentage}%`,
                        backgroundColor: '#B53A3A',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'white',
                        fontSize: '25px',
                        borderRadius: '5px',
                    }}
                >
                    {lowPercentage > 0 ? `${lowPercentage.toFixed(0)}%` : ''}
                </div>
                {/* Green segment for in-range glucose */}
                <div
                    style={{
                        width: `${inRangePercentage}%`,
                        backgroundColor: '#3AA246',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'white',
                        fontSize: '25px',
                        fontWeight: 'bold',
                        borderRadius: '5px',
                    }}
                >
                    {inRangePercentage > 0
                        ? `${inRangePercentage.toFixed(0)}%`
                        : ''}
                </div>
                {/* Yellow segment for high glucose */}
                <div
                    style={{
                        width: `${highPercentage}%`,
                        backgroundColor: '#CBA63F',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'white',
                        fontSize: '25px',
                        borderRadius: '5px',
                    }}
                >
                    {highPercentage > 0 ? `${highPercentage.toFixed(0)}%` : ''}
                </div>
            </div>
            <div
                style={{
                    textAlign: 'center',
                    marginTop: '10px',
                    fontFamily: 'Roboto',
                }}
            >
                Time in range (past 24 hours)
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
