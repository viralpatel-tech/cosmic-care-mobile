
import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Activity,
    ArrowLeft,
    ArrowRight,
    Bell,
    BrainCircuit,
    ChevronDown,
    ChevronRight,
    CircleCheck,
    Heart,
    Info,
    Radio,
    RotateCcw,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Thermometer,
    TriangleAlert,
    Users,
    Wind,
    Moon,
} from 'lucide-react-native';
import { useMissionHealth } from '../context/MissionHealthContext';
import {
    getSeverityColor,
    getSeverityLabel,
    type HealthAlert,
    type HealthMetric,
} from '../services/healthAlertEngine';
import {
    predictCrewHealth,
    getPredictionRiskColor,
    getPredictionRiskLabel,
    getPredictionTrendLabel,
} from '../services/predictiveHealthEngine';

const COLORS = {
    background: '#050B18',
    card: '#101D32',
    elevated: '#152640',
    border: '#263A56',
    cyan: '#44E4F4',
    purple: '#A78BFA',
    green: '#4ADEA3',
    yellow: '#FBBF24',
    red: '#FB7185',
    white: '#F4F8FF',
    muted: '#93A6C4',
};

const CREW = [
    {
        id: 'CM-01',
        name: 'Alex Morgan',
        role: 'Commander',
        initials: 'AM',
        color: COLORS.cyan,
    },
    {
        id: 'CM-02',
        name: 'Maya Chen',
        role: 'Flight Engineer',
        initials: 'MC',
        color: COLORS.purple,
    },
    {
        id: 'CM-03',
        name: 'Jordan Lee',
        role: 'Mission Specialist',
        initials: 'JL',
        color: COLORS.green,
    },
    {
        id: 'CM-04',
        name: 'Sam Rivera',
        role: 'Medical Officer',
        initials: 'SR',
        color: COLORS.yellow,
    },
];

function MetricIcon({
                        metric,
                        color,
                    }: {
    metric: HealthMetric;
    color: string;
}) {
    switch (metric) {
        case 'heart':
            return <Heart size={21} color={color} />;
        case 'oxygen':
            return <Wind size={21} color={color} />;
        case 'temperature':
            return <Thermometer size={21} color={color} />;
        case 'sleep':
            return <Moon size={21} color={color} />;
        case 'respiration':
            return <Activity size={21} color={color} />;
    }
}

function AlertCard({
                       alert,
                   }: {
    alert: HealthAlert;
}) {
    const color = getSeverityColor(alert.severity);

    return (
        <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
                <View
                    style={[
                        styles.alertIcon,
                        { backgroundColor: color + '18' },
                    ]}
                >
                    <MetricIcon metric={alert.metric} color={color} />
                </View>

                <View style={styles.alertHeaderText}>
                    <Text style={styles.alertTitle}>
                        {alert.title}
                    </Text>

                    <Text style={styles.alertMetric}>
                        {alert.value} {alert.unit}
                    </Text>
                </View>

                <View
                    style={[
                        styles.severityBadge,
                        { backgroundColor: color + '18' },
                    ]}
                >
                    <Text
                        style={[
                            styles.severityText,
                            { color },
                        ]}
                    >
                        {getSeverityLabel(alert.severity)}
                    </Text>
                </View>
            </View>

            <Text style={styles.alertMessage}>
                {alert.message}
            </Text>

            <View style={styles.recommendationBox}>
                <Sparkles size={17} color={COLORS.purple} />

                <Text style={styles.recommendationText}>
                    {alert.recommendation}
                </Text>
            </View>
        </View>
    );
}

export default function AlertsScreen() {
    const router = useRouter();

    const {
        selectedId,
        setSelectedId,
        selectedCrewAssessment,
        history,
        alertDemo,
        alertId,
        triggerAlert,
        clearAlert,
        activeAlertCount,
        highestSeverity,
        addSample,
    } = useMissionHealth();

    const [crewPickerOpen, setCrewPickerOpen] =
        useState(false);

    const selectedCrew =
        CREW.find(crew => crew.id === selectedId) ??
        CREW[0];

    const crewHistory = useMemo(
        () =>
            history.filter(
                record => record.crewId === selectedId
            ),
        [history, selectedId]
    );

    const prediction = useMemo(
        () =>
            predictCrewHealth(selectedId, crewHistory, {
                horizonSteps: 5,
                sampleIntervalMinutes: 0.075,
                maxSamples: 30,
            }),
        [selectedId, crewHistory]
    );

    const hasPrediction =
        prediction.predictedHealthScore !== null;

    const projectedWarnings = prediction.metrics.filter(
        metric =>
            metric.predictedValue !== null &&
            metric.risk !== 'low'
    );

    const hasProjectedWarning =
        hasPrediction &&
        prediction.overallRisk !== 'low';

    const activeAlerts =
        selectedCrewAssessment.alerts.filter(
            alert => alert.severity !== 'normal'
        );

    const currentSeverityColor =
        getSeverityColor(selectedCrewAssessment.severity);

    const predictionRiskColor = hasPrediction
        ? getPredictionRiskColor(prediction.overallRisk)
        : COLORS.muted;

    const demoActive =
        alertDemo && alertId === selectedId;

    const demoHistoryCount = crewHistory.filter(
        record => record.demoAlert
    ).length;

    const selectCrew = (id: string) => {
        setSelectedId(id);
        setCrewPickerOpen(false);
    };

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
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => router.replace('/')}
                    >
                        <ArrowLeft
                            size={22}
                            color={COLORS.white}
                        />
                    </TouchableOpacity>

                    <View style={styles.headerText}>
                        <Text style={styles.brand}>
                            ✦ COSMIC CARE
                        </Text>

                        <Text style={styles.headerSubtitle}>
                            MISSION ALERT CENTER
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => router.push('/analysis')}
                    >
                        <BrainCircuit
                            size={21}
                            color={COLORS.purple}
                        />
                    </TouchableOpacity>
                </View>

                <LinearGradient
                    colors={[
                        '#253452',
                        '#172B48',
                        '#101D32',
                    ]}
                    style={styles.hero}
                >
                    <View style={styles.heroTop}>
                        <View style={styles.liveBadge}>
                            <Radio
                                size={15}
                                color={COLORS.green}
                            />

                            <Text style={styles.liveText}>
                                MONITORING ACTIVE
                            </Text>
                        </View>

                        <Text style={styles.missionId}>
                            MISSION CC-01
                        </Text>
                    </View>

                    <View style={styles.heroIcon}>
                        <Bell
                            size={32}
                            color={COLORS.cyan}
                        />
                    </View>

                    <Text style={styles.heroTitle}>
                        Health Alert Center
                    </Text>

                    <Text style={styles.heroDescription}>
                        Monitor current biometric alerts,
                        review simulated future risks,
                        and inspect astronaut-specific
                        health warnings.
                    </Text>

                    <View style={styles.heroDivider} />

                    <View style={styles.heroStats}>
                        <View>
                            <Text style={styles.heroStatValue}>
                                {activeAlertCount}
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                MISSION ALERTS
                            </Text>
                        </View>

                        <View>
                            <Text
                                style={[
                                    styles.heroStatValue,
                                    {
                                        color: getSeverityColor(
                                            highestSeverity
                                        ),
                                    },
                                ]}
                            >
                                {getSeverityLabel(highestSeverity)}
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                HIGHEST SEVERITY
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Select Astronaut
                    </Text>

                    <Users
                        size={20}
                        color={COLORS.cyan}
                    />
                </View>

                <TouchableOpacity
                    style={styles.crewPicker}
                    onPress={() =>
                        setCrewPickerOpen(value => !value)
                    }
                >
                    <View
                        style={[
                            styles.avatar,
                            {
                                backgroundColor:
                                    selectedCrew.color + '20',
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.avatarText,
                                { color: selectedCrew.color },
                            ]}
                        >
                            {selectedCrew.initials}
                        </Text>
                    </View>

                    <View style={styles.crewText}>
                        <Text style={styles.crewName}>
                            {selectedCrew.name}
                        </Text>

                        <Text style={styles.crewRole}>
                            {selectedCrew.role} · {selectedCrew.id}
                        </Text>
                    </View>

                    <ChevronDown
                        size={20}
                        color={COLORS.cyan}
                    />
                </TouchableOpacity>

                {crewPickerOpen && (
                    <View style={styles.crewOptions}>
                        {CREW.map(crew => (
                            <TouchableOpacity
                                key={crew.id}
                                style={styles.crewOption}
                                onPress={() => selectCrew(crew.id)}
                            >
                                <Text
                                    style={[
                                        styles.crewOptionName,
                                        selectedId === crew.id && {
                                            color: COLORS.cyan,
                                        },
                                    ]}
                                >
                                    {crew.name}
                                </Text>

                                <Text style={styles.crewOptionId}>
                                    {crew.id}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Current Health Status
                    </Text>

                    <ShieldCheck
                        size={21}
                        color={currentSeverityColor}
                    />
                </View>

                <View style={styles.statusCard}>
                    <View style={styles.statusTop}>
                        <View>
                            <Text style={styles.smallLabel}>
                                CURRENT ASSESSMENT
                            </Text>

                            <Text
                                style={[
                                    styles.statusValue,
                                    { color: currentSeverityColor },
                                ]}
                            >
                                {getSeverityLabel(
                                    selectedCrewAssessment.severity
                                )}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.statusIcon,
                                {
                                    backgroundColor:
                                        currentSeverityColor + '18',
                                },
                            ]}
                        >
                            {activeAlerts.length > 0 ? (
                                <ShieldAlert
                                    size={26}
                                    color={currentSeverityColor}
                                />
                            ) : (
                                <ShieldCheck
                                    size={26}
                                    color={currentSeverityColor}
                                />
                            )}
                        </View>
                    </View>

                    <Text style={styles.statusDescription}>
                        {selectedCrewAssessment.summary}
                    </Text>

                    <View style={styles.statusDivider} />

                    <View style={styles.statusBottom}>
                        <View>
                            <Text style={styles.smallLabel}>
                                HEALTH SCORE
                            </Text>

                            <Text style={styles.healthScore}>
                                {selectedCrewAssessment.score}
                                <Text style={styles.scoreSuffix}>
                                    /100
                                </Text>
                            </Text>
                        </View>

                        <View style={styles.statusBottomRight}>
                            <Text style={styles.smallLabel}>
                                ACTIVE CREW ALERTS
                            </Text>

                            <Text style={styles.alertCount}>
                                {activeAlerts.length}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Current Alerts
                    </Text>

                    <Text style={styles.sectionCount}>
                        {activeAlerts.length} detected
                    </Text>
                </View>

                {activeAlerts.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <CircleCheck
                            size={31}
                            color={COLORS.green}
                        />

                        <Text style={styles.emptyTitle}>
                            No Active Health Alerts
                        </Text>

                        <Text style={styles.emptyDescription}>
                            Current simulated readings
                            are within the configured
                            monitoring thresholds.
                        </Text>
                    </View>
                ) : (
                    activeAlerts.map(alert => (
                        <AlertCard
                            key={alert.id}
                            alert={alert}
                        />
                    ))
                )}

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Predictive Risk Analysis
                    </Text>

                    <BrainCircuit
                        size={21}
                        color={COLORS.purple}
                    />
                </View>

                <View style={styles.predictionCard}>
                    <View style={styles.predictionHeader}>
                        <View style={styles.predictionIcon}>
                            <BrainCircuit
                                size={25}
                                color={COLORS.purple}
                            />
                        </View>

                        <View style={styles.predictionHeaderText}>
                            <Text style={styles.predictionTitle}>
                                Future Health Forecast
                            </Text>

                            <Text style={styles.predictionSubtitle}>
                                Five simulated future samples
                            </Text>
                        </View>
                    </View>

                    <View style={styles.predictionScores}>
                        <View>
                            <Text style={styles.smallLabel}>
                                CURRENT SCORE
                            </Text>

                            <Text style={styles.predictionScore}>
                                {prediction.currentHealthScore ?? '--'}
                            </Text>
                        </View>

                        <ArrowRight
                            size={22}
                            color={COLORS.purple}
                        />

                        <View>
                            <Text style={styles.smallLabel}>
                                PROJECTED SCORE
                            </Text>

                            <Text
                                style={[
                                    styles.predictionScore,
                                    { color: COLORS.purple },
                                ]}
                            >
                                {prediction.predictedHealthScore ?? '--'}
                            </Text>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.predictionRisk,
                            {
                                backgroundColor:
                                    predictionRiskColor + '18',
                            },
                        ]}
                    >
                        {hasProjectedWarning ? (
                            <TriangleAlert
                                size={20}
                                color={predictionRiskColor}
                            />
                        ) : (
                            <ShieldCheck
                                size={20}
                                color={predictionRiskColor}
                            />
                        )}

                        <Text
                            style={[
                                styles.predictionRiskText,
                                { color: predictionRiskColor },
                            ]}
                        >
                            {hasPrediction
                                ? `${getPredictionRiskLabel(
                                    prediction.overallRisk
                                )} Projected Risk`
                                : 'Waiting for Forecast Data'}
                        </Text>
                    </View>

                    <Text style={styles.predictionDescription}>
                        {hasPrediction
                            ? `${prediction.sampleCount} saved samples analyzed with ${prediction.confidence} confidence.`
                            : 'At least three saved telemetry samples are required before a projected health score can be calculated.'}
                    </Text>

                    <TouchableOpacity
                        style={styles.analysisButton}
                        onPress={() => router.push('/analysis')}
                    >
                        <Text style={styles.analysisButtonText}>
                            OPEN PREDICTIVE ANALYTICS
                        </Text>

                        <ChevronRight
                            size={19}
                            color={COLORS.purple}
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Projected Metric Warnings
                    </Text>

                    <Text style={styles.sectionCount}>
                        {projectedWarnings.length} flags
                    </Text>
                </View>

                {projectedWarnings.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <ShieldCheck
                            size={30}
                            color={COLORS.green}
                        />

                        <Text style={styles.emptyTitle}>
                            No Projected Metric Warnings
                        </Text>

                        <Text style={styles.emptyDescription}>
                            {hasPrediction
                                ? 'The current simulation does not forecast elevated biometric risk.'
                                : 'Collect more telemetry to enable projected metric warnings.'}
                        </Text>
                    </View>
                ) : (
                    projectedWarnings.map(metric => {
                        const color =
                            getPredictionRiskColor(metric.risk);

                        return (
                            <View
                                key={metric.metric}
                                style={styles.projectedCard}
                            >
                                <View style={styles.projectedHeader}>
                                    <View
                                        style={[
                                            styles.projectedIcon,
                                            {
                                                backgroundColor:
                                                    color + '18',
                                            },
                                        ]}
                                    >
                                        <MetricIcon
                                            metric={metric.metric}
                                            color={color}
                                        />
                                    </View>

                                    <View style={styles.projectedTitleBox}>
                                        <Text style={styles.projectedTitle}>
                                            {metric.label}
                                        </Text>

                                        <Text style={styles.projectedSubtitle}>
                                            {getPredictionTrendLabel(
                                                metric.trend
                                            )}
                                        </Text>
                                    </View>

                                    <Text
                                        style={[
                                            styles.projectedRiskLabel,
                                            { color },
                                        ]}
                                    >
                                        {getPredictionRiskLabel(metric.risk)}
                                    </Text>
                                </View>

                                <View style={styles.projectedValues}>
                                    <Text style={styles.projectedValue}>
                                        {metric.currentValue ?? '--'}
                                    </Text>

                                    <ArrowRight
                                        size={18}
                                        color={COLORS.muted}
                                    />

                                    <Text
                                        style={[
                                            styles.projectedValue,
                                            { color },
                                        ]}
                                    >
                                        {metric.predictedValue ?? '--'}
                                    </Text>

                                    <Text style={styles.projectedUnit}>
                                        {metric.unit}
                                    </Text>
                                </View>

                                <Text style={styles.projectedExplanation}>
                                    {metric.explanation}
                                </Text>
                            </View>
                        );
                    })
                )}

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Demo Alert Controls
                    </Text>

                    <Radio
                        size={20}
                        color={COLORS.yellow}
                    />
                </View>

                <View style={styles.demoCard}>
                    <Text style={styles.demoTitle}>
                        Alert Simulation
                    </Text>

                    <Text style={styles.demoDescription}>
                        Trigger simulated abnormal
                        biometric readings for the
                        selected astronaut to test
                        Cosmic Care's alert detection.
                    </Text>

                    <TouchableOpacity
                        style={styles.triggerButton}
                        onPress={() => triggerAlert(selectedId)}
                    >
                        <TriangleAlert
                            size={19}
                            color={COLORS.background}
                        />

                        <Text style={styles.triggerButtonText}>
                            TRIGGER DEMO ALERT
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={clearAlert}
                    >
                        <RotateCcw
                            size={18}
                            color={COLORS.cyan}
                        />

                        <Text style={styles.clearButtonText}>
                            CLEAR DEMO ALERT
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.demoStatus}>
                        <View
                            style={[
                                styles.demoDot,
                                {
                                    backgroundColor: demoActive
                                        ? COLORS.red
                                        : COLORS.green,
                                },
                            ]}
                        />

                        <Text style={styles.demoStatusText}>
                            {demoActive
                                ? `Demo alert active for ${selectedCrew.name}`
                                : 'No demo alert active for selected astronaut'}
                        </Text>
                    </View>

                    <Text style={styles.demoHistoryText}>
                        {demoHistoryCount} historical demo alert samples
                    </Text>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Mission Navigation
                    </Text>

                    <Activity
                        size={20}
                        color={COLORS.cyan}
                    />
                </View>

                <TouchableOpacity
                    style={styles.navigationCard}
                    onPress={() => router.push('/analysis')}
                >
                    <BrainCircuit
                        size={22}
                        color={COLORS.purple}
                    />

                    <View style={styles.navigationText}>
                        <Text style={styles.navigationTitle}>
                            Predictive Analytics
                        </Text>

                        <Text style={styles.navigationSubtitle}>
                            Detailed simulated future forecasts
                        </Text>
                    </View>

                    <ChevronRight
                        size={20}
                        color={COLORS.purple}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navigationCard}
                    onPress={() => router.push('/missionoverview')}
                >
                    <Users
                        size={22}
                        color={COLORS.green}
                    />

                    <View style={styles.navigationText}>
                        <Text style={styles.navigationTitle}>
                            Mission Predictive Overview
                        </Text>

                        <Text style={styles.navigationSubtitle}>
                            Compare risk across all astronauts
                        </Text>
                    </View>

                    <ChevronRight
                        size={20}
                        color={COLORS.green}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navigationCard}
                    onPress={() => router.push('/history')}
                >
                    <Activity
                        size={22}
                        color={COLORS.cyan}
                    />

                    <View style={styles.navigationText}>
                        <Text style={styles.navigationTitle}>
                            Telemetry History
                        </Text>

                        <Text style={styles.navigationSubtitle}>
                            Inspect saved readings and demo events
                        </Text>
                    </View>

                    <ChevronRight
                        size={20}
                        color={COLORS.cyan}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.sampleButton}
                    onPress={addSample}
                >
                    <Radio
                        size={19}
                        color={COLORS.cyan}
                    />

                    <Text style={styles.sampleButtonText}>
                        Generate Telemetry Sample
                    </Text>
                </TouchableOpacity>

                <View style={styles.disclaimer}>
                    <Info
                        size={20}
                        color={COLORS.cyan}
                    />

                    <Text style={styles.disclaimerText}>
                        Cosmic Care is an educational
                        simulation. Alerts and forecasts
                        are generated from fictional
                        astronaut telemetry using
                        illustrative thresholds and
                        mathematical trends. They are
                        not validated medical guidance.
                    </Text>
                </View>

                <Text style={styles.footer}>
                    COSMIC CARE · MISSION CC-01
                    {'\n'}
                    PREDICTIVE ALERT INTELLIGENCE
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 55,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 23,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 13,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
        marginLeft: 13,
    },
    brand: {
        color: COLORS.cyan,
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    headerSubtitle: {
        color: COLORS.muted,
        fontSize: 9,
        letterSpacing: 1,
        marginTop: 5,
    },
    hero: {
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#45578B',
        padding: 20,
        marginBottom: 25,
    },
    heroTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: '#194344',
        borderRadius: 20,
        paddingHorizontal: 11,
        paddingVertical: 8,
    },
    liveText: {
        color: COLORS.green,
        fontSize: 9,
        fontWeight: '900',
    },
    missionId: {
        color: COLORS.purple,
        fontSize: 10,
        fontWeight: '900',
    },
    heroIcon: {
        width: 68,
        height: 68,
        borderRadius: 19,
        backgroundColor: '#28425B',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 25,
        marginBottom: 18,
    },
    heroTitle: {
        color: COLORS.white,
        fontSize: 26,
        fontWeight: '900',
    },
    heroDescription: {
        color: '#D2D0EA',
        fontSize: 12,
        lineHeight: 21,
        marginTop: 11,
    },
    heroDivider: {
        height: 1,
        backgroundColor: '#45578B',
        marginVertical: 21,
    },
    heroStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    heroStatValue: {
        color: COLORS.white,
        fontSize: 22,
        fontWeight: '900',
    },
    heroStatLabel: {
        color: COLORS.muted,
        fontSize: 9,
        marginTop: 7,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        marginBottom: 14,
    },
    sectionTitle: {
        color: COLORS.white,
        fontSize: 19,
        fontWeight: '900',
    },
    sectionCount: {
        color: COLORS.muted,
        fontSize: 11,
    },
    crewPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 15,
        padding: 13,
        marginBottom: 20,
    },
    avatar: {
        width: 45,
        height: 45,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '900',
    },
    crewText: {
        flex: 1,
        marginLeft: 12,
    },
    crewName: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '900',
    },
    crewRole: {
        color: COLORS.muted,
        fontSize: 11,
        marginTop: 5,
    },
    crewOptions: {
        backgroundColor: COLORS.elevated,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        marginTop: -11,
        marginBottom: 20,
        overflow: 'hidden',
    },
    crewOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    crewOptionName: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '700',
    },
    crewOptionId: {
        color: COLORS.muted,
        fontSize: 11,
    },
    statusCard: {
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 17,
        padding: 18,
        marginBottom: 24,
    },
    statusTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    smallLabel: {
        color: COLORS.muted,
        fontSize: 10,
        fontWeight: '800',
    },
    statusValue: {
        fontSize: 24,
        fontWeight: '900',
        marginTop: 9,
    },
    statusIcon: {
        width: 50,
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusDescription: {
        color: '#B8C8DB',
        fontSize: 12,
        lineHeight: 20,
        marginTop: 17,
    },
    statusDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 19,
    },
    statusBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statusBottomRight: {
        alignItems: 'flex-end',
    },
    healthScore: {
        color: COLORS.cyan,
        fontSize: 28,
        fontWeight: '900',
        marginTop: 7,
    },
    scoreSuffix: {
        color: COLORS.muted,
        fontSize: 12,
    },
    alertCount: {
        color: COLORS.red,
        fontSize: 28,
        fontWeight: '900',
        marginTop: 7,
    },
    alertCard: {
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    alertIcon: {
        width: 44,
        height: 44,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    alertHeaderText: {
        flex: 1,
        marginLeft: 11,
    },
    alertTitle: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '900',
    },
    alertMetric: {
        color: COLORS.muted,
        fontSize: 11,
        marginTop: 6,
    },
    severityBadge: {
        borderRadius: 9,
        paddingHorizontal: 9,
        paddingVertical: 7,
    },
    severityText: {
        fontSize: 9,
        fontWeight: '900',
    },
    alertMessage: {
        color: '#B8C8DB',
        fontSize: 12,
        lineHeight: 20,
        marginTop: 15,
    },
    recommendationBox: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: '#22243E',
        borderRadius: 11,
        padding: 12,
        marginTop: 15,
    },
    recommendationText: {
        flex: 1,
        color: '#C8BDF3',
        fontSize: 11,
        lineHeight: 18,
    },
    emptyCard: {
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        padding: 25,
        marginBottom: 24,
    },
    emptyTitle: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '900',
        marginTop: 14,
    },
    emptyDescription: {
        color: COLORS.muted,
        fontSize: 12,
        lineHeight: 20,
        textAlign: 'center',
        marginTop: 10,
    },
    predictionCard: {
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: '#514979',
        borderRadius: 17,
        padding: 17,
        marginBottom: 24,
    },
    predictionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    predictionIcon: {
        width: 46,
        height: 46,
        borderRadius: 13,
        backgroundColor: '#332B55',
        alignItems: 'center',
        justifyContent: 'center',
    },
    predictionHeaderText: {
        flex: 1,
        marginLeft: 12,
    },
    predictionTitle: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '900',
    },
    predictionSubtitle: {
        color: COLORS.muted,
        fontSize: 11,
        marginTop: 6,
    },
    predictionScores: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginTop: 25,
    },
    predictionScore: {
        color: COLORS.white,
        fontSize: 28,
        fontWeight: '900',
        marginTop: 8,
    },
    predictionRisk: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 12,
        padding: 13,
        marginTop: 23,
    },
    predictionRiskText: {
        fontSize: 12,
        fontWeight: '900',
    },
    predictionDescription: {
        color: '#B8C8DB',
        fontSize: 11,
        lineHeight: 19,
        marginTop: 17,
    },
    analysisButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 17,
        marginTop: 18,
    },
    analysisButtonText: {
        color: COLORS.purple,
        fontSize: 11,
        fontWeight: '900',
    },
    projectedCard: {
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    projectedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    projectedIcon: {
        width: 43,
        height: 43,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    projectedTitleBox: {
        flex: 1,
        marginLeft: 11,
    },
    projectedTitle: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '900',
    },
    projectedSubtitle: {
        color: COLORS.muted,
        fontSize: 11,
        marginTop: 6,
    },
    projectedRiskLabel: {
        fontSize: 11,
        fontWeight: '900',
    },
    projectedValues: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginTop: 18,
    },
    projectedValue: {
        color: COLORS.white,
        fontSize: 22,
        fontWeight: '900',
    },
    projectedUnit: {
        color: COLORS.muted,
        fontSize: 11,
    },
    projectedExplanation: {
        color: '#B8C8DB',
        fontSize: 11,
        lineHeight: 19,
        marginTop: 15,
    },
    demoCard: {
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        padding: 17,
        marginBottom: 24,
    },
    demoTitle: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '900',
    },
    demoDescription: {
        color: COLORS.muted,
        fontSize: 12,
        lineHeight: 20,
        marginTop: 11,
    },
    triggerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: COLORS.yellow,
        borderRadius: 12,
        paddingVertical: 15,
        marginTop: 20,
    },
    triggerButtonText: {
        color: COLORS.background,
        fontSize: 11,
        fontWeight: '900',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#15384B',
        borderRadius: 12,
        paddingVertical: 15,
        marginTop: 10,
    },
    clearButtonText: {
        color: COLORS.cyan,
        fontSize: 11,
        fontWeight: '900',
    },
    demoStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginTop: 17,
    },
    demoDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
    },
    demoStatusText: {
        color: COLORS.muted,
        fontSize: 11,
    },
    demoHistoryText: {
        color: COLORS.muted,
        fontSize: 11,
        marginTop: 11,
    },
    navigationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 15,
        padding: 16,
        marginBottom: 11,
    },
    navigationText: {
        flex: 1,
        marginLeft: 13,
    },
    navigationTitle: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '900',
    },
    navigationSubtitle: {
        color: COLORS.muted,
        fontSize: 11,
        marginTop: 6,
    },
    sampleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#15384B',
        borderRadius: 13,
        paddingVertical: 16,
        marginTop: 12,
        marginBottom: 22,
    },
    sampleButtonText: {
        color: COLORS.cyan,
        fontSize: 12,
        fontWeight: '900',
    },
    disclaimer: {
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
        color: COLORS.muted,
        fontSize: 9,
        textAlign: 'center',
        lineHeight: 18,
        marginTop: 27,
    },
});
