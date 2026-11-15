
import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
    Polyline,
    Line,
    Circle,
} from 'react-native-svg';
import {
    Activity,
    Heart,
    Wind,
    Thermometer,
    Moon,
    Database,
    History,
    ArrowRight,
    RefreshCw,
    AlertTriangle,
    ShieldCheck,
    ChevronDown,
    ChevronRight,
    Radio,
    BellRing,
    Info,
    Clock,
    BarChart3,
    HeartPulse,
} from 'lucide-react-native';

import {
    useMissionHealth,
    MetricKey,
} from '../../context/MissionHealthContext';

import {
    AlertSeverity,
    getSeverityColor,
    getSeverityLabel,
} from '../../services/healthAlertEngine';

const C = {
    bg: '#050B18',
    card: '#101D32',
    card2: '#14243B',
    border: '#263A56',
    cyan: '#44E4F4',
    purple: '#A78BFA',
    green: '#4ADEA3',
    pink: '#FB7185',
    yellow: '#FBBF24',
    white: '#F4F8FF',
    muted: '#93A6C4',
};

const CREW = [
    { id: 'CM-01', name: 'Alex Morgan', role: 'Commander' },
    { id: 'CM-02', name: 'Maya Chen', role: 'Flight Engineer' },
    { id: 'CM-03', name: 'Jordan Lee', role: 'Mission Specialist' },
    { id: 'CM-04', name: 'Sam Rivera', role: 'Medical Officer' },
];

const METRICS: {
    key: MetricKey;
    label: string;
    unit: string;
    color: string;
}[] = [
    { key: 'heart', label: 'Heart Rate', unit: 'BPM', color: C.pink },
    { key: 'oxygen', label: 'Blood Oxygen', unit: '%', color: C.cyan },
    { key: 'temperature', label: 'Temperature', unit: '°C', color: C.purple },
    { key: 'sleep', label: 'Sleep Duration', unit: 'hrs', color: C.green },
    { key: 'respiration', label: 'Respiratory Rate', unit: '/min', color: C.yellow },
];

function formatValue(
    metric: MetricKey,
    value: number
): string {
    if (metric === 'temperature' || metric === 'sleep') {
        return value.toFixed(1);
    }

    return value.toFixed(0);
}

function MetricIcon({
                        metric,
                        color,
                        size = 21,
                    }: {
    metric: MetricKey;
    color: string;
    size?: number;
}) {
    switch (metric) {
        case 'heart':
            return <Heart color={color} size={size} />;
        case 'oxygen':
            return <Wind color={color} size={size} />;
        case 'temperature':
            return <Thermometer color={color} size={size} />;
        case 'sleep':
            return <Moon color={color} size={size} />;
        default:
            return <Activity color={color} size={size} />;
    }
}

function SeverityIcon({
                          severity,
                          size = 22,
                      }: {
    severity: AlertSeverity;
    size?: number;
}) {
    const color = getSeverityColor(severity);

    if (severity === 'normal') {
        return <ShieldCheck color={color} size={size} />;
    }

    if (severity === 'advisory') {
        return <Info color={color} size={size} />;
    }

    return <AlertTriangle color={color} size={size} />;
}

function TrendChart({
                        values,
                        color,
                    }: {
    values: number[];
    color: string;
}) {
    const width = 320;
    const height = 170;
    const padding = 14;

    const chart = useMemo(() => {
        if (values.length === 0) {
            return {
                points: '',
                x: 0,
                y: 0,
            };
        }

        const minimum = Math.min(...values) - 2;
        const maximum = Math.max(...values) + 2;
        const range = Math.max(1, maximum - minimum);

        const coordinates = values.map((value, index) => {
            const x =
                padding +
                (index / Math.max(1, values.length - 1)) *
                (width - padding * 2);

            const y =
                height -
                padding -
                ((value - minimum) / range) *
                (height - padding * 2);

            return { x, y };
        });

        const last = coordinates[coordinates.length - 1];

        return {
            points: coordinates
                .map(point => `${point.x},${point.y}`)
                .join(' '),
            x: last.x,
            y: last.y,
        };
    }, [values]);

    if (values.length === 0) {
        return (
            <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>
                    Waiting for telemetry...
                </Text>
            </View>
        );
    }

    return (
        <Svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
        >
            {[35, 75, 115, 150].map(y => (
                <Line
                    key={y}
                    x1="0"
                    y1={y}
                    x2={width}
                    y2={y}
                    stroke={C.border}
                    strokeWidth="1"
                    strokeDasharray="4 5"
                />
            ))}

            <Polyline
                points={chart.points}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            <Circle
                cx={chart.x}
                cy={chart.y}
                r="5"
                fill={color}
            />
        </Svg>
    );
}

export default function VitalsScreen() {
    const router = useRouter();

    const {
        telemetry,
        tick,
        selectedId,
        setSelectedId,
        crewReadings,
        history,
        historyLoaded,
        addSample,
        selectedCrewAssessment,
        activeAlertCount,
        highestSeverity,
        alertDemo,
        alertId,
    } = useMissionHealth();

    const [activeMetric, setActiveMetric] =
        useState<MetricKey>('heart');

    const [showCrewPicker, setShowCrewPicker] =
        useState(false);

    const selectedCrew =
        CREW.find(member => member.id === selectedId) ??
        CREW[0];

    const readings = crewReadings(selectedId);

    const assessment = selectedCrewAssessment;

    const severityColor =
        getSeverityColor(highestSeverity);

    const selectedMetric =
        METRICS.find(metric => metric.key === activeMetric) ??
        METRICS[0];

    const values: Record<MetricKey, number> = {
        heart: readings.heart,
        oxygen: readings.oxygen,
        temperature: readings.temperature,
        sleep: readings.sleep,
        respiration: readings.respiratory,
    };

    const crewHistory = useMemo(
        () =>
            history
                .filter(record => record.crewId === selectedId)
                .sort(
                    (a, b) =>
                        new Date(a.timestamp).getTime() -
                        new Date(b.timestamp).getTime()
                ),
        [history, selectedId]
    );

    const historicalValues = useMemo(
        () =>
            crewHistory
                .slice(-30)
                .map(record => record[activeMetric]),
        [crewHistory, activeMetric]
    );

    const chartValues =
        historicalValues.length >= 2
            ? historicalValues
            : telemetry[activeMetric];

    const historicalAverage =
        historicalValues.length > 0
            ? historicalValues.reduce(
            (sum, value) => sum + value,
            0
        ) / historicalValues.length
            : null;

    const latestHistory =
        crewHistory.length > 0
            ? crewHistory[crewHistory.length - 1]
            : null;

    const lastSaved = latestHistory
        ? new Date(
            latestHistory.timestamp
        ).toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
        })
        : 'Not available';

    const demoActiveForCrew =
        alertDemo && alertId === selectedId;

    const openAlerts = () =>
        router.push('/alerts');

    const openHistory = () =>
        router.push('/history');

    return (
        <SafeAreaView
            style={styles.root}
            edges={['top']}
        >
            <StatusBar barStyle="light-content" />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View>
                        <Text style={styles.brand}>
                            ✦ COSMIC CARE
                        </Text>

                        <Text style={styles.eyebrow}>
                            ADVANCED VITALS MONITORING
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={openAlerts}
                    >
                        <BellRing color={C.cyan} size={24} />

                        {activeAlertCount > 0 && (
                            <View style={styles.notificationDot} />
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.title}>
                    Vital Signs
                </Text>

                <Text style={styles.subtitle}>
                    Real-time fictional telemetry, health
                    assessment, and mission history.
                </Text>

                <LinearGradient
                    colors={['#173A53', '#10243C']}
                    style={styles.liveCard}
                >
                    <View style={styles.liveTop}>
                        <View style={styles.liveBadge}>
                            <Radio color={C.green} size={14} />

                            <Text style={styles.liveBadgeText}>
                                LIVE SIMULATION
                            </Text>
                        </View>

                        <Text style={styles.tickText}>
                            UPDATE #{tick}
                        </Text>
                    </View>

                    <Text style={styles.liveTitle}>
                        Crew Health Monitor
                    </Text>

                    <Text style={styles.liveDescription}>
                        Fictional biometric readings update
                        automatically and are evaluated by
                        the rule-based alert engine.
                    </Text>

                    <View style={styles.liveFooter}>
                        <ShieldCheck color={C.green} size={16} />

                        <Text style={styles.liveFooterText}>
                            Educational demonstration data
                        </Text>
                    </View>
                </LinearGradient>

                <Text style={styles.sectionTitle}>
                    Select Astronaut
                </Text>

                <TouchableOpacity
                    style={styles.crewPicker}
                    onPress={() =>
                        setShowCrewPicker(value => !value)
                    }
                >
                    <View style={styles.crewAvatar}>
                        <HeartPulse color={C.cyan} size={21} />
                    </View>

                    <View style={styles.crewDetails}>
                        <Text style={styles.crewName}>
                            {selectedCrew.name}
                        </Text>

                        <Text style={styles.crewRole}>
                            {selectedCrew.role} · {selectedCrew.id}
                        </Text>
                    </View>

                    <ChevronDown color={C.cyan} size={20} />
                </TouchableOpacity>

                {showCrewPicker && (
                    <View style={styles.crewMenu}>
                        {CREW.map(member => (
                            <TouchableOpacity
                                key={member.id}
                                style={styles.crewOption}
                                onPress={() => {
                                    setSelectedId(member.id);
                                    setShowCrewPicker(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.crewOptionName,
                                        selectedId === member.id && {
                                            color: C.cyan,
                                        },
                                    ]}
                                >
                                    {member.name}
                                </Text>

                                <Text style={styles.crewOptionId}>
                                    {member.id}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <TouchableOpacity
                    style={[
                        styles.healthStatusCard,
                        {
                            borderColor: severityColor + '65',
                            backgroundColor: severityColor + '12',
                        },
                    ]}
                    onPress={openAlerts}
                >
                    <View
                        style={[
                            styles.statusIcon,
                            {
                                backgroundColor:
                                    severityColor + '18',
                            },
                        ]}
                    >
                        <SeverityIcon
                            severity={highestSeverity}
                            size={26}
                        />
                    </View>

                    <View style={styles.statusDetails}>
                        <Text style={styles.statusEyebrow}>
                            HEALTH ASSESSMENT
                        </Text>

                        <Text
                            style={[
                                styles.statusTitle,
                                { color: severityColor },
                            ]}
                        >
                            {assessment.status}
                        </Text>

                        <Text style={styles.statusDescription}>
                            {activeAlertCount} active rule alert
                            {activeAlertCount === 1 ? '' : 's'}
                        </Text>
                    </View>

                    <ChevronRight
                        color={severityColor}
                        size={21}
                    />
                </TouchableOpacity>

                <View style={styles.scoreCard}>
                    <View style={styles.scoreHeader}>
                        <View>
                            <Text style={styles.scoreLabel}>
                                SIMULATED HEALTH SCORE
                            </Text>

                            <Text style={styles.scoreDescription}>
                                Rule-based demonstration score
                            </Text>
                        </View>

                        <Text
                            style={[
                                styles.scoreValue,
                                { color: severityColor },
                            ]}
                        >
                            {assessment.score}
                            <Text style={styles.scoreTotal}>
                                /100
                            </Text>
                        </Text>
                    </View>

                    <View style={styles.scoreTrack}>
                        <View
                            style={[
                                styles.scoreFill,
                                {
                                    width: `${assessment.score}%`,
                                    backgroundColor: severityColor,
                                },
                            ]}
                        />
                    </View>

                    <View style={styles.scoreFooter}>
                        <Text style={styles.scoreFooterText}>
                            Severity
                        </Text>

                        <Text
                            style={[
                                styles.scoreSeverity,
                                { color: severityColor },
                            ]}
                        >
                            {getSeverityLabel(highestSeverity)}
                        </Text>
                    </View>
                </View>

                <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>
                        Current Readings
                    </Text>

                    <TouchableOpacity
                        onPress={addSample}
                        style={styles.smallRefresh}
                    >
                        <RefreshCw color={C.cyan} size={18} />
                    </TouchableOpacity>
                </View>

                <View style={styles.metricsGrid}>
                    {METRICS.map(metric => {
                        const metricAlert =
                            assessment.alerts.find(
                                alert => alert.metric === metric.key
                            );

                        const metricColor = metricAlert
                            ? getSeverityColor(metricAlert.severity)
                            : metric.color;

                        return (
                            <TouchableOpacity
                                key={metric.key}
                                style={[
                                    styles.metricCard,
                                    activeMetric === metric.key && {
                                        borderColor: metricColor,
                                    },
                                ]}
                                onPress={() =>
                                    setActiveMetric(metric.key)
                                }
                            >
                                <View style={styles.metricTop}>
                                    <MetricIcon
                                        metric={metric.key}
                                        color={metricColor}
                                    />

                                    <View
                                        style={[
                                            styles.metricDot,
                                            {
                                                backgroundColor: metricColor,
                                            },
                                        ]}
                                    />
                                </View>

                                <Text style={styles.metricLabel}>
                                    {metric.label.toUpperCase()}
                                </Text>

                                <View style={styles.metricValueRow}>
                                    <Text style={styles.metricValue}>
                                        {formatValue(
                                            metric.key,
                                            values[metric.key]
                                        )}
                                    </Text>

                                    <Text style={styles.metricUnit}>
                                        {metric.unit}
                                    </Text>
                                </View>

                                <Text
                                    style={[
                                        styles.metricStatus,
                                        {
                                            color: metricAlert
                                                ? metricColor
                                                : C.green,
                                        },
                                    ]}
                                >
                                    {metricAlert
                                        ? getSeverityLabel(
                                            metricAlert.severity
                                        )
                                        : 'NORMAL DEMO'}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <View style={styles.chartHeading}>
                            <MetricIcon
                                metric={activeMetric}
                                color={selectedMetric.color}
                            />

                            <Text style={styles.chartTitle}>
                                {selectedMetric.label} Trend
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.chartRefresh}
                            onPress={addSample}
                        >
                            <RefreshCw color={C.cyan} size={17} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.chartSubtitle}>
                        {historicalValues.length >= 2
                            ? 'Saved readings for the selected astronaut'
                            : 'Shared fictional telemetry stream'}
                    </Text>

                    <View style={styles.chartValueRow}>
                        <Text style={styles.chartValue}>
                            {formatValue(
                                activeMetric,
                                values[activeMetric]
                            )}
                        </Text>

                        <Text style={styles.chartUnit}>
                            {selectedMetric.unit}
                        </Text>
                    </View>

                    <TrendChart
                        values={chartValues}
                        color={selectedMetric.color}
                    />

                    <View style={styles.chartFooter}>
                        <Text style={styles.chartFooterText}>
                            {chartValues.length} data points
                        </Text>

                        <Text style={styles.chartFooterText}>
                            SIMULATED
                        </Text>
                    </View>
                </View>

                <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>
                        Health Alerts
                    </Text>

                    <TouchableOpacity
                        style={styles.sectionLink}
                        onPress={openAlerts}
                    >
                        <Text style={styles.sectionLinkText}>
                            View All
                        </Text>

                        <ArrowRight color={C.cyan} size={16} />
                    </TouchableOpacity>
                </View>

                {assessment.alerts.length === 0 ? (
                    <View style={styles.noAlertsCard}>
                        <ShieldCheck color={C.green} size={23} />

                        <View style={styles.noAlertsText}>
                            <Text style={styles.noAlertsTitle}>
                                No Active Health Alerts
                            </Text>

                            <Text style={styles.noAlertsDescription}>
                                All readings are within the
                                configured demonstration ranges.
                            </Text>
                        </View>
                    </View>
                ) : (
                    assessment.alerts.slice(0, 3).map(alert => {
                        const color = getSeverityColor(
                            alert.severity
                        );

                        return (
                            <TouchableOpacity
                                key={alert.id}
                                style={[
                                    styles.alertCard,
                                    { borderColor: color + '65' },
                                ]}
                                onPress={openAlerts}
                            >
                                <AlertTriangle
                                    color={color}
                                    size={22}
                                />

                                <View style={styles.alertDetails}>
                                    <Text style={styles.alertTitle}>
                                        {alert.title}
                                    </Text>

                                    <Text
                                        style={[
                                            styles.alertSeverity,
                                            { color },
                                        ]}
                                    >
                                        {getSeverityLabel(
                                            alert.severity
                                        )}
                                    </Text>
                                </View>

                                <ChevronRight
                                    color={C.muted}
                                    size={19}
                                />
                            </TouchableOpacity>
                        );
                    })
                )}

                <TouchableOpacity
                    style={styles.alertCenterButton}
                    onPress={openAlerts}
                >
                    <BellRing color={C.cyan} size={20} />

                    <Text style={styles.alertCenterButtonText}>
                        Open Mission Alert Center
                    </Text>

                    <ArrowRight color={C.cyan} size={19} />
                </TouchableOpacity>

                <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>
                        Mission History
                    </Text>

                    <TouchableOpacity
                        style={styles.sectionLink}
                        onPress={openHistory}
                    >
                        <Text style={styles.sectionLinkText}>
                            View All
                        </Text>

                        <ArrowRight color={C.cyan} size={16} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={openHistory}
                >
                    <LinearGradient
                        colors={['#1A304D', '#111F35']}
                        style={styles.historyCard}
                    >
                        <View style={styles.historyTop}>
                            <View style={styles.historyIcon}>
                                <Database color={C.cyan} size={24} />
                            </View>

                            <View style={styles.historyDetails}>
                                <Text style={styles.historyEyebrow}>
                                    SAVED CREW TELEMETRY
                                </Text>

                                <Text style={styles.historyCount}>
                                    {historyLoaded
                                        ? crewHistory.length
                                        : '...'}{' '}
                                    records
                                </Text>
                            </View>

                            <History color={C.muted} size={21} />
                        </View>

                        <View style={styles.historyDivider} />

                        <View style={styles.historyStats}>
                            <View style={styles.historyStat}>
                                <Clock color={C.muted} size={16} />

                                <View>
                                    <Text style={styles.historyStatLabel}>
                                        LAST SAVED
                                    </Text>

                                    <Text style={styles.historyStatValue}>
                                        {lastSaved}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.historyStat}>
                                <BarChart3 color={C.purple} size={16} />

                                <View>
                                    <Text style={styles.historyStatLabel}>
                                        AVG {selectedMetric.label.toUpperCase()}
                                    </Text>

                                    <Text style={styles.historyStatValue}>
                                        {historicalAverage === null
                                            ? '--'
                                            : formatValue(
                                                activeMetric,
                                                historicalAverage
                                            )}{' '}
                                        {selectedMetric.unit}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.historyBottom}>
                            <Text style={styles.historyBottomText}>
                                Open Mission History
                            </Text>

                            <ArrowRight color={C.cyan} size={18} />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.disclaimerCard}>
                    <Info color={C.cyan} size={19} />

                    <Text style={styles.disclaimerText}>
                        Cosmic Care uses fictional telemetry
                        and illustrative health thresholds.
                        It is an educational simulator,
                        not a diagnostic or medical device.
                    </Text>
                </View>

                <Text style={styles.footer}>
                    COSMIC CARE · MISSION CC-01
                    {'\n'}
                    SIMULATED DATA · EDUCATIONAL USE
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.bg,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 55,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    brand: {
        color: C.cyan,
        fontSize: 17,
        fontWeight: '900',
        letterSpacing: 1.4,
    },
    eyebrow: {
        color: C.muted,
        fontSize: 9,
        letterSpacing: 1.2,
        marginTop: 6,
    },
    headerButton: {
        width: 45,
        height: 45,
        borderRadius: 14,
        backgroundColor: '#153047',
        borderWidth: 1,
        borderColor: '#27516B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationDot: {
        position: 'absolute',
        top: 7,
        right: 7,
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: C.pink,
        borderWidth: 2,
        borderColor: '#153047',
    },
    title: {
        color: C.white,
        fontSize: 30,
        fontWeight: '900',
    },
    subtitle: {
        color: C.muted,
        fontSize: 13,
        lineHeight: 21,
        marginTop: 9,
        marginBottom: 22,
    },
    liveCard: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#2C5774',
        marginBottom: 27,
    },
    liveTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: '#173D3D',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 20,
    },
    liveBadgeText: {
        color: C.green,
        fontSize: 9,
        fontWeight: '900',
    },
    tickText: {
        color: C.muted,
        fontSize: 10,
    },
    liveTitle: {
        color: C.white,
        fontSize: 22,
        fontWeight: '900',
        marginTop: 22,
    },
    liveDescription: {
        color: '#B2C5DA',
        fontSize: 12,
        lineHeight: 20,
        marginTop: 9,
    },
    liveFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginTop: 20,
    },
    liveFooterText: {
        color: C.green,
        fontSize: 11,
    },
    sectionTitle: {
        color: C.white,
        fontSize: 19,
        fontWeight: '900',
    },
    sectionHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        marginBottom: 15,
    },
    crewPicker: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 15,
        padding: 13,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        marginBottom: 15,
    },
    crewAvatar: {
        width: 43,
        height: 43,
        borderRadius: 13,
        backgroundColor: '#163C4A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    crewDetails: {
        flex: 1,
        marginLeft: 12,
    },
    crewName: {
        color: C.white,
        fontSize: 14,
        fontWeight: '800',
    },
    crewRole: {
        color: C.muted,
        fontSize: 11,
        marginTop: 5,
    },
    crewMenu: {
        backgroundColor: C.card2,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        marginTop: -7,
        marginBottom: 20,
        overflow: 'hidden',
    },
    crewOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    crewOptionName: {
        color: C.white,
        fontSize: 13,
        fontWeight: '700',
    },
    crewOptionId: {
        color: C.muted,
        fontSize: 11,
    },
    healthStatusCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 15,
    },
    statusIcon: {
        width: 49,
        height: 49,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusDetails: {
        flex: 1,
    },
    statusEyebrow: {
        color: C.muted,
        fontSize: 9,
        fontWeight: '700',
        marginBottom: 6,
    },
    statusTitle: {
        fontSize: 14,
        fontWeight: '900',
    },
    statusDescription: {
        color: C.muted,
        fontSize: 11,
        marginTop: 5,
    },
    scoreCard: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        padding: 17,
        marginBottom: 25,
    },
    scoreHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    scoreLabel: {
        color: C.white,
        fontSize: 11,
        fontWeight: '800',
    },
    scoreDescription: {
        color: C.muted,
        fontSize: 10,
        marginTop: 6,
    },
    scoreValue: {
        fontSize: 27,
        fontWeight: '900',
    },
    scoreTotal: {
        color: C.muted,
        fontSize: 13,
    },
    scoreTrack: {
        height: 8,
        borderRadius: 5,
        backgroundColor: '#23364E',
        marginTop: 20,
        overflow: 'hidden',
    },
    scoreFill: {
        height: '100%',
        borderRadius: 5,
    },
    scoreFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    scoreFooterText: {
        color: C.muted,
        fontSize: 10,
    },
    scoreSeverity: {
        fontSize: 10,
        fontWeight: '900',
    },
    smallRefresh: {
        width: 35,
        height: 35,
        borderRadius: 11,
        backgroundColor: '#15384B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    metricCard: {
        width: '48%',
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 17,
        padding: 15,
        marginBottom: 12,
    },
    metricTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    metricDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    metricLabel: {
        color: C.muted,
        fontSize: 10,
    },
    metricValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 5,
        marginTop: 9,
    },
    metricValue: {
        color: C.white,
        fontSize: 27,
        fontWeight: '900',
    },
    metricUnit: {
        color: C.muted,
        fontSize: 11,
    },
    metricStatus: {
        fontSize: 10,
        fontWeight: '800',
        marginTop: 12,
    },
    chartCard: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 18,
        padding: 17,
        marginBottom: 24,
    },
    chartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chartHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
    },
    chartTitle: {
        color: C.white,
        fontSize: 16,
        fontWeight: '800',
    },
    chartSubtitle: {
        color: C.muted,
        fontSize: 11,
        marginTop: 11,
    },
    chartRefresh: {
        width: 36,
        height: 36,
        borderRadius: 11,
        backgroundColor: '#15384B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 7,
        marginTop: 19,
        marginBottom: 15,
    },
    chartValue: {
        color: C.white,
        fontSize: 32,
        fontWeight: '900',
    },
    chartUnit: {
        color: C.muted,
        fontSize: 13,
    },
    chartFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    chartFooterText: {
        color: C.muted,
        fontSize: 10,
    },
    emptyChart: {
        height: 170,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyChartText: {
        color: C.muted,
        fontSize: 12,
    },
    sectionLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sectionLinkText: {
        color: C.cyan,
        fontSize: 12,
        fontWeight: '800',
    },
    noAlertsCard: {
        backgroundColor: '#112C29',
        borderWidth: 1,
        borderColor: '#2B6150',
        borderRadius: 15,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    noAlertsText: {
        flex: 1,
    },
    noAlertsTitle: {
        color: C.green,
        fontSize: 13,
        fontWeight: '800',
    },
    noAlertsDescription: {
        color: C.muted,
        fontSize: 11,
        lineHeight: 18,
        marginTop: 6,
    },
    alertCard: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderRadius: 14,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 11,
    },
    alertDetails: {
        flex: 1,
    },
    alertTitle: {
        color: C.white,
        fontSize: 12,
        fontWeight: '800',
    },
    alertSeverity: {
        fontSize: 10,
        fontWeight: '900',
        marginTop: 6,
    },
    alertCenterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        backgroundColor: '#123044',
        borderWidth: 1,
        borderColor: '#28526B',
        borderRadius: 14,
        padding: 16,
        marginBottom: 25,
    },
    alertCenterButtonText: {
        flex: 1,
        color: C.cyan,
        fontSize: 12,
        fontWeight: '800',
    },
    historyCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#2D4A69',
        padding: 19,
        marginBottom: 22,
    },
    historyTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyIcon: {
        width: 45,
        height: 45,
        borderRadius: 13,
        backgroundColor: '#163C4A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyDetails: {
        flex: 1,
        marginLeft: 12,
    },
    historyEyebrow: {
        color: C.muted,
        fontSize: 10,
    },
    historyCount: {
        color: C.white,
        fontSize: 19,
        fontWeight: '900',
        marginTop: 5,
    },
    historyDivider: {
        height: 1,
        backgroundColor: C.border,
        marginVertical: 19,
    },
    historyStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    historyStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        flex: 1,
    },
    historyStatLabel: {
        color: C.muted,
        fontSize: 9,
    },
    historyStatValue: {
        color: C.white,
        fontSize: 12,
        fontWeight: '800',
        marginTop: 5,
    },
    historyBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 23,
    },
    historyBottomText: {
        color: C.cyan,
        fontSize: 12,
        fontWeight: '800',
    },
    disclaimerCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 11,
        backgroundColor: '#11283A',
        borderRadius: 14,
        padding: 15,
    },
    disclaimerText: {
        flex: 1,
        color: '#AFC4D6',
        fontSize: 11,
        lineHeight: 19,
    },
    footer: {
        color: '#657A96',
        fontSize: 9,
        textAlign: 'center',
        marginTop: 27,
        lineHeight: 18,
    },
});
