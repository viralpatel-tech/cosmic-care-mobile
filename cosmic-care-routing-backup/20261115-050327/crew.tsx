
import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
    Line,
    Path,
    Circle,
} from 'react-native-svg';
import {
    Activity,
    ArrowLeft,
    ArrowRight,
    BellRing,
    BrainCircuit,
    ChevronDown,
    ChevronRight,
    Database,
    Heart,
    Info,
    Moon,
    Radio,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Thermometer,
    TrendingDown,
    TrendingUp,
    Minus,
    Users,
    Wind,
} from 'lucide-react-native';

import {
    useMissionHealth,
    type CrewReadings,
} from '../context/MissionHealthContext';

import {
    predictCrewHealth,
    predictMissionHealth,
    getPredictionRiskColor,
    getPredictionRiskLabel,
    getPredictionTrendLabel,
    type CrewPrediction,
    type MetricPrediction,
    type PredictionRisk,
    type PredictionTrend,
} from '../services/predictiveHealthEngine';

import {
    getSeverityColor,
    getSeverityLabel,
    type HealthAssessment,
    type HealthMetric,
} from '../services/healthAlertEngine';

const C = {
    bg: '#050B18',
    card: '#101D32',
    card2: '#152640',
    border: '#263A56',
    cyan: '#44E4F4',
    purple: '#A78BFA',
    green: '#4ADEA3',
    yellow: '#FBBF24',
    pink: '#FB7185',
    white: '#F4F8FF',
    muted: '#93A6C4',
    dim: '#657A96',
};

const CREW = [
    {
        id: 'CM-01',
        name: 'Alex Morgan',
        role: 'Commander',
        initials: 'AM',
        color: '#44E4F4',
    },
    {
        id: 'CM-02',
        name: 'Maya Chen',
        role: 'Flight Engineer',
        initials: 'MC',
        color: '#A78BFA',
    },
    {
        id: 'CM-03',
        name: 'Jordan Lee',
        role: 'Mission Specialist',
        initials: 'JL',
        color: '#4ADEA3',
    },
    {
        id: 'CM-04',
        name: 'Sam Rivera',
        role: 'Medical Officer',
        initials: 'SR',
        color: '#FBBF24',
    },
];

const CREW_IDS = CREW.map(member => member.id);

const METRIC_COLORS: Record<HealthMetric, string> = {
    heart: C.pink,
    oxygen: C.cyan,
    temperature: C.yellow,
    sleep: C.purple,
    respiration: C.green,
};

const FORECAST_OPTIONS = {
    horizonSteps: 5,
    sampleIntervalMinutes: 0.075,
    maxSamples: 30,
};

type CrewMember = (typeof CREW)[number];

type CrewDashboardItem = {
    member: CrewMember;
    readings: CrewReadings;
    assessment: HealthAssessment;
    prediction: CrewPrediction;
    hasForecast: boolean;
};

function formatMetric(
    value: number | null,
    metric: HealthMetric
): string {
    if (value === null) {
        return '--';
    }

    return metric === 'temperature' || metric === 'sleep'
        ? value.toFixed(1)
        : String(Math.round(value));
}

function metricIcon(
    metric: HealthMetric,
    color: string,
    size: number = 19
) {
    switch (metric) {
        case 'heart':
            return <Heart color={color} size={size} />;
        case 'oxygen':
            return <Wind color={color} size={size} />;
        case 'temperature':
            return <Thermometer color={color} size={size} />;
        case 'sleep':
            return <Moon color={color} size={size} />;
        case 'respiration':
            return <Activity color={color} size={size} />;
    }
}

function trendIcon(
    trend: PredictionTrend,
    color: string
) {
    switch (trend) {
        case 'increasing':
            return <TrendingUp color={color} size={17} />;
        case 'decreasing':
            return <TrendingDown color={color} size={17} />;
        default:
            return <Minus color={color} size={17} />;
    }
}

function ScoreBar({
                      score,
                      color,
                  }: {
    score: number;
    color: string;
}) {
    const percentage = Math.max(
        0,
        Math.min(100, score)
    );

    return (
        <View style={styles.scoreTrack}>
            <View
                style={[
                    styles.scoreFill,
                    {
                        width: `${percentage}%` as `${number}%`,
                        backgroundColor: color,
                    },
                ]}
            />
        </View>
    );
}

function VitalMini({
                       label,
                       metric,
                       value,
                       unit,
                   }: {
    label: string;
    metric: HealthMetric;
    value: number;
    unit: string;
}) {
    const color = METRIC_COLORS[metric];

    return (
        <View style={styles.vitalMini}>
            <View style={styles.vitalMiniHeader}>
                {metricIcon(metric, color, 16)}
                <Text style={styles.vitalMiniLabel}>
                    {label}
                </Text>
            </View>

            <Text style={styles.vitalMiniValue}>
                {formatMetric(value, metric)}
                <Text style={styles.vitalMiniUnit}>
                    {' '}{unit}
                </Text>
            </Text>
        </View>
    );
}

function PredictionSparkline({
                                 metric,
                                 width,
                             }: {
    metric: MetricPrediction;
    width: number;
}) {
    const values = [
        ...(metric.currentValue !== null
            ? [metric.currentValue]
            : []),
        ...metric.forecast.map(point => point.value),
    ];

    if (values.length < 2) {
        return (
            <View style={styles.sparklineEmpty}>
                <Text style={styles.sparklineEmptyText}>
                    Awaiting forecast
                </Text>
            </View>
        );
    }

    const height = 55;
    const padding = 6;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(
        0.001,
        max - min
    );

    const points = values.map((value, index) => ({
        x:
            padding +
            (index / (values.length - 1)) *
            (width - padding * 2),
        y:
            padding +
            (1 - (value - min) / range) *
            (height - padding * 2),
    }));

    const path = points
        .map(
            (point, index) =>
                `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
        )
        .join(' ');

    const last = points[points.length - 1];

    return (
        <Svg width={width} height={height}>
            <Line
                x1={padding}
                y1={height / 2}
                x2={width - padding}
                y2={height / 2}
                stroke={C.border}
                strokeWidth={1}
                strokeDasharray="4 4"
            />

            <Path
                d={path}
                stroke={METRIC_COLORS[metric.metric]}
                strokeWidth={2.5}
                strokeDasharray="5 4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            <Circle
                cx={last.x}
                cy={last.y}
                r={4}
                fill={METRIC_COLORS[metric.metric]}
            />
        </Svg>
    );
}

function CrewComparisonRow({
                               item,
                               selected,
                               onPress,
                           }: {
    item: CrewDashboardItem;
    selected: boolean;
    onPress: () => void;
}) {
    const { member, assessment, prediction, hasForecast } =
        item;

    const riskColor = hasForecast
        ? getPredictionRiskColor(prediction.overallRisk)
        : C.muted;

    const riskLabel = hasForecast
        ? getPredictionRiskLabel(prediction.overallRisk)
        : 'Awaiting Data';

    return (
        <TouchableOpacity
            style={[
                styles.comparisonRow,
                selected && styles.comparisonRowSelected,
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View
                style={[
                    styles.comparisonAvatar,
                    { backgroundColor: member.color + '20' },
                ]}
            >
                <Text
                    style={[
                        styles.comparisonInitials,
                        { color: member.color },
                    ]}
                >
                    {member.initials}
                </Text>
            </View>

            <View style={styles.comparisonDetails}>
                <Text style={styles.comparisonName}>
                    {member.name}
                </Text>

                <Text style={styles.comparisonRole}>
                    {member.role}
                </Text>
            </View>

            <View style={styles.comparisonRight}>
                <Text style={styles.comparisonScores}>
                    {assessment.score}
                    {' → '}
                    {hasForecast
                        ? prediction.predictedHealthScore
                        : '--'}
                </Text>

                <Text
                    style={[
                        styles.comparisonRisk,
                        { color: riskColor },
                    ]}
                >
                    {riskLabel}
                </Text>
            </View>

            <ChevronRight color={C.dim} size={17} />
        </TouchableOpacity>
    );
}

function ForecastMetricCard({
                                metric,
                                width,
                            }: {
    metric: MetricPrediction;
    width: number;
}) {
    const color = METRIC_COLORS[metric.metric];
    const riskColor = getPredictionRiskColor(
        metric.risk
    );

    return (
        <View style={styles.forecastMetricCard}>
            <View style={styles.forecastMetricTop}>
                <View style={styles.forecastMetricIdentity}>
                    <View
                        style={[
                            styles.forecastMetricIcon,
                            { backgroundColor: color + '18' },
                        ]}
                    >
                        {metricIcon(metric.metric, color, 20)}
                    </View>

                    <View>
                        <Text style={styles.forecastMetricTitle}>
                            {metric.label}
                        </Text>

                        <View style={styles.forecastTrendRow}>
                            {trendIcon(metric.trend, color)}

                            <Text
                                style={[
                                    styles.forecastTrendText,
                                    { color },
                                ]}
                            >
                                {getPredictionTrendLabel(
                                    metric.trend
                                )}
                            </Text>
                        </View>
                    </View>
                </View>

                <View
                    style={[
                        styles.forecastRiskBadge,
                        { backgroundColor: riskColor + '18' },
                    ]}
                >
                    <Text
                        style={[
                            styles.forecastRiskText,
                            { color: riskColor },
                        ]}
                    >
                        {metric.predictedValue === null
                            ? 'No Forecast'
                            : getPredictionRiskLabel(metric.risk)}
                    </Text>
                </View>
            </View>

            <View style={styles.forecastMetricValues}>
                <View>
                    <Text style={styles.forecastValueLabel}>
                        CURRENT
                    </Text>

                    <Text style={styles.forecastValue}>
                        {formatMetric(
                            metric.currentValue,
                            metric.metric
                        )}
                        <Text style={styles.forecastUnit}>
                            {' '}{metric.unit}
                        </Text>
                    </Text>
                </View>

                <ArrowRight color={C.muted} size={20} />

                <View>
                    <Text style={styles.forecastValueLabel}>
                        PROJECTED
                    </Text>

                    <Text
                        style={[
                            styles.forecastValue,
                            { color: C.purple },
                        ]}
                    >
                        {formatMetric(
                            metric.predictedValue,
                            metric.metric
                        )}
                        <Text style={styles.forecastUnit}>
                            {' '}{metric.unit}
                        </Text>
                    </Text>
                </View>
            </View>

            <PredictionSparkline
                metric={metric}
                width={width}
            />

            <Text style={styles.forecastExplanation}>
                {metric.explanation}
            </Text>
        </View>
    );
}

export default function CrewScreen() {
    const router = useRouter();

    const { width: windowWidth } =
        useWindowDimensions();

    const {
        selectedId,
        setSelectedId,
        crewReadings,
        assessCrew,
        history,
        historyLoaded,
        tick,
        addSample,
        activeAlertCount,
    } = useMissionHealth();

    const [expandedCrew, setExpandedCrew] =
        useState<string | null>(selectedId);

    const [showAllForecasts, setShowAllForecasts] =
        useState(false);

    const missionPrediction = useMemo(
        () =>
            predictMissionHealth(
                CREW_IDS,
                history,
                FORECAST_OPTIONS
            ),
        [history]
    );

    const crewDashboard = useMemo<CrewDashboardItem[]>(
        () =>
            CREW.map(member => {
                const readings = crewReadings(member.id);
                const assessment = assessCrew(member.id);

                const prediction =
                    missionPrediction.crew.find(
                        item => item.crewId === member.id
                    ) ??
                    predictCrewHealth(
                        member.id,
                        history,
                        FORECAST_OPTIONS
                    );

                return {
                    member,
                    readings,
                    assessment,
                    prediction,
                    hasForecast:
                        prediction.sampleCount >= 3 &&
                        prediction.predictedHealthScore !== null,
                };
            }),
        [
            crewReadings,
            assessCrew,
            missionPrediction,
            history,
        ]
    );

    const selectedItem =
        crewDashboard.find(
            item => item.member.id === selectedId
        ) ?? crewDashboard[0];

    const selectedAssessment =
        selectedItem.assessment;

    const selectedPrediction =
        selectedItem.prediction;

    const selectedReadings =
        selectedItem.readings;

    const selectedHasForecast =
        selectedItem.hasForecast;

    const currentStatusColor =
        getSeverityColor(
            selectedAssessment.severity
        );

    const projectedRiskColor =
        selectedHasForecast
            ? getPredictionRiskColor(
                selectedPrediction.overallRisk
            )
            : C.muted;

    const projectedRiskLabel =
        selectedHasForecast
            ? getPredictionRiskLabel(
                selectedPrediction.overallRisk
            )
            : 'Awaiting Data';

    const scoreDifference =
        selectedHasForecast &&
        selectedPrediction.predictedHealthScore !== null
            ? selectedPrediction.predictedHealthScore -
            selectedAssessment.score
            : null;

    const flaggedCrew =
        missionPrediction.flaggedCrewIds.length;

    const metricsToShow = showAllForecasts
        ? selectedPrediction.metrics
        : selectedPrediction.metrics.slice(0, 3);

    const sparklineWidth = Math.max(
        200,
        windowWidth - 76
    );

    const openAnalysis = () =>
        router.push('/analysis');

    const openVitals = () =>
        router.push('/vitals');

    const openAI = () =>
        router.push('/aicare');

    const openAlerts = () =>
        router.push('/alerts');

    const openHistory = () =>
        router.push('/history');

    const chooseCrew = (id: string) => {
        setSelectedId(id);
        setExpandedCrew(id);
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
                        <ArrowLeft color={C.white} size={22} />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.brand}>
                            ✦ COSMIC CARE
                        </Text>

                        <Text style={styles.headerSubtitle}>
                            CREW HEALTH INTELLIGENCE
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={openAlerts}
                    >
                        <BellRing color={C.cyan} size={21} />

                        {activeAlertCount > 0 && (
                            <View style={styles.alertDot} />
                        )}
                    </TouchableOpacity>
                </View>

                <LinearGradient
                    colors={['#173D58', '#182B49', '#101D32']}
                    style={styles.hero}
                >
                    <View style={styles.heroTop}>
                        <View style={styles.heroBadge}>
                            <Radio color={C.green} size={14} />

                            <Text style={styles.heroBadgeText}>
                                CREW SIMULATION ACTIVE
                            </Text>
                        </View>

                        <Text style={styles.heroMission}>
                            MISSION CC-01
                        </Text>
                    </View>

                    <View style={styles.heroIcon}>
                        <Users color={C.cyan} size={32} />
                    </View>

                    <Text style={styles.heroTitle}>
                        Crew Health Dashboard
                    </Text>

                    <Text style={styles.heroDescription}>
                        Monitor four fictional astronauts,
                        compare their current health
                        indicators, and explore projected
                        biometric trends.
                    </Text>

                    <View style={styles.heroDivider} />

                    <View style={styles.heroStats}>
                        <View>
                            <Text style={styles.heroStatValue}>
                                04
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                CREW MEMBERS
                            </Text>
                        </View>

                        <View>
                            <Text style={styles.heroStatValue}>
                                {missionPrediction.analyzedCrewCount}
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                FORECAST READY
                            </Text>
                        </View>

                        <View>
                            <Text style={styles.heroStatValue}>
                                {flaggedCrew}
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                PROJECTED FLAGS
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Mission Risk Overview
                    </Text>

                    <ShieldAlert
                        color={C.yellow}
                        size={20}
                    />
                </View>

                <View style={styles.missionCard}>
                    <View style={styles.missionCardTop}>
                        <View>
                            <Text style={styles.cardEyebrow}>
                                MISSION-WIDE PROJECTED RISK
                            </Text>

                            <Text
                                style={[
                                    styles.missionRiskValue,
                                    {
                                        color:
                                            missionPrediction.analyzedCrewCount > 0
                                                ? getPredictionRiskColor(
                                                    missionPrediction.overallRisk
                                                )
                                                : C.muted,
                                    },
                                ]}
                            >
                                {missionPrediction.analyzedCrewCount > 0
                                    ? getPredictionRiskLabel(
                                        missionPrediction.overallRisk
                                    )
                                    : 'Awaiting Data'}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.missionRiskIcon,
                                {
                                    backgroundColor:
                                        missionPrediction.analyzedCrewCount > 0
                                            ? getPredictionRiskColor(
                                            missionPrediction.overallRisk
                                        ) + '18'
                                            : C.card2,
                                },
                            ]}
                        >
                            <ShieldCheck
                                color={
                                    missionPrediction.analyzedCrewCount > 0
                                        ? getPredictionRiskColor(
                                            missionPrediction.overallRisk
                                        )
                                        : C.muted
                                }
                                size={25}
                            />
                        </View>
                    </View>

                    <View style={styles.missionScoreRow}>
                        <View>
                            <Text style={styles.missionScoreLabel}>
                                AVERAGE PROJECTED SCORE
                            </Text>

                            <Text style={styles.missionScoreValue}>
                                {missionPrediction.averagePredictedScore ??
                                    '--'}
                                <Text style={styles.missionScoreMaximum}>
                                    /100
                                </Text>
                            </Text>
                        </View>

                        <View>
                            <Text style={styles.missionScoreLabel}>
                                CREW ANALYZED
                            </Text>

                            <Text style={styles.missionScoreValue}>
                                {missionPrediction.analyzedCrewCount}
                                <Text style={styles.missionScoreMaximum}>
                                    /4
                                </Text>
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.missionSummary}>
                        {missionPrediction.summary}
                    </Text>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Crew Comparison
                    </Text>

                    <Users color={C.cyan} size={20} />
                </View>

                <Text style={styles.sectionDescription}>
                    Select an astronaut to inspect current
                    readings and simulated forecasts.
                </Text>

                <View style={styles.comparisonCard}>
                    {crewDashboard.map(item => (
                        <CrewComparisonRow
                            key={item.member.id}
                            item={item}
                            selected={
                                selectedId === item.member.id
                            }
                            onPress={() =>
                                chooseCrew(item.member.id)
                            }
                        />
                    ))}
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Selected Astronaut
                    </Text>

                    <ChevronDown
                        color={C.muted}
                        size={20}
                    />
                </View>

                <View style={styles.selectedCard}>
                    <View style={styles.selectedHeader}>
                        <View
                            style={[
                                styles.selectedAvatar,
                                {
                                    backgroundColor:
                                        selectedItem.member.color + '20',
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.selectedInitials,
                                    {
                                        color:
                                        selectedItem.member.color,
                                    },
                                ]}
                            >
                                {selectedItem.member.initials}
                            </Text>
                        </View>

                        <View style={styles.selectedIdentity}>
                            <Text style={styles.selectedName}>
                                {selectedItem.member.name}
                            </Text>

                            <Text style={styles.selectedRole}>
                                {selectedItem.member.role}
                                {' · '}
                                {selectedItem.member.id}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.currentStatusBadge,
                                {
                                    backgroundColor:
                                        currentStatusColor + '18',
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.currentStatusText,
                                    { color: currentStatusColor },
                                ]}
                            >
                                {getSeverityLabel(
                                    selectedAssessment.severity
                                )}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.scoreComparison}>
                        <View>
                            <Text style={styles.scoreLabel}>
                                CURRENT SCORE
                            </Text>

                            <Text style={styles.scoreValue}>
                                {selectedAssessment.score}
                            </Text>
                        </View>

                        <ArrowRight color={C.muted} size={22} />

                        <View>
                            <Text style={styles.scoreLabel}>
                                PROJECTED SCORE
                            </Text>

                            <Text
                                style={[
                                    styles.scoreValue,
                                    { color: C.purple },
                                ]}
                            >
                                {selectedHasForecast
                                    ? selectedPrediction.predictedHealthScore
                                    : '--'}
                            </Text>
                        </View>
                    </View>

                    <ScoreBar
                        score={selectedAssessment.score}
                        color={currentStatusColor}
                    />

                    <View style={styles.selectedRiskRow}>
                        <View
                            style={[
                                styles.selectedRiskBadge,
                                {
                                    backgroundColor:
                                        projectedRiskColor + '18',
                                },
                            ]}
                        >
                            <ShieldAlert
                                color={projectedRiskColor}
                                size={16}
                            />

                            <Text
                                style={[
                                    styles.selectedRiskText,
                                    { color: projectedRiskColor },
                                ]}
                            >
                                {projectedRiskLabel}
                            </Text>
                        </View>

                        <Text style={styles.sampleCount}>
                            {selectedPrediction.sampleCount} samples
                        </Text>
                    </View>

                    {scoreDifference !== null && (
                        <View style={styles.scoreDifferenceRow}>
                            {scoreDifference < 0 ? (
                                <TrendingDown
                                    color={C.yellow}
                                    size={17}
                                />
                            ) : scoreDifference > 0 ? (
                                <TrendingUp
                                    color={C.green}
                                    size={17}
                                />
                            ) : (
                                <Minus color={C.cyan} size={17} />
                            )}

                            <Text style={styles.scoreDifferenceText}>
                                {scoreDifference === 0
                                    ? 'Projected score remains stable'
                                    : `Projected score ${
                                        scoreDifference > 0
                                            ? 'increases'
                                            : 'decreases'
                                    } by ${Math.abs(scoreDifference)} points`}
                            </Text>
                        </View>
                    )}

                    <Text style={styles.selectedSummary}>
                        {selectedAssessment.summary}
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={openAnalysis}
                    >
                        <BrainCircuit
                            color={C.bg}
                            size={19}
                        />

                        <Text style={styles.primaryButtonText}>
                            Open Predictive Analytics
                        </Text>

                        <ArrowRight color={C.bg} size={19} />
                    </TouchableOpacity>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Current Vital Signs
                    </Text>

                    <TouchableOpacity onPress={openVitals}>
                        <Text style={styles.inlineLink}>
                            View Vitals
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.vitalGrid}>
                    <VitalMini
                        label="Heart Rate"
                        metric="heart"
                        value={selectedReadings.heart}
                        unit="BPM"
                    />

                    <VitalMini
                        label="Oxygen"
                        metric="oxygen"
                        value={selectedReadings.oxygen}
                        unit="%"
                    />

                    <VitalMini
                        label="Temperature"
                        metric="temperature"
                        value={selectedReadings.temperature}
                        unit="°C"
                    />

                    <VitalMini
                        label="Sleep"
                        metric="sleep"
                        value={selectedReadings.sleep}
                        unit="hours"
                    />

                    <VitalMini
                        label="Respiration"
                        metric="respiration"
                        value={selectedReadings.respiratory}
                        unit="/min"
                    />
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Biometric Forecasts
                    </Text>

                    <Sparkles
                        color={C.purple}
                        size={20}
                    />
                </View>

                <Text style={styles.sectionDescription}>
                    Each chart shows a mathematical
                    projection based on saved fictional
                    telemetry. Dashed lines represent
                    future simulation steps.
                </Text>

                {metricsToShow.map(metric => (
                    <ForecastMetricCard
                        key={`${selectedId}-${metric.metric}`}
                        metric={metric}
                        width={sparklineWidth}
                    />
                ))}

                <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={() =>
                        setShowAllForecasts(value => !value)
                    }
                >
                    <Text style={styles.showMoreText}>
                        {showAllForecasts
                            ? 'Show Fewer Metrics'
                            : 'Show All Five Metrics'}
                    </Text>

                    <ChevronDown
                        color={C.cyan}
                        size={18}
                    />
                </TouchableOpacity>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Mission Insights
                    </Text>

                    <BrainCircuit
                        color={C.purple}
                        size={20}
                    />
                </View>

                <View style={styles.insightsCard}>
                    {selectedPrediction.insights.map(
                        (insight, index) => (
                            <View
                                key={`${index}-${insight}`}
                                style={styles.insightRow}
                            >
                                <View style={styles.insightDot} />

                                <Text style={styles.insightText}>
                                    {insight}
                                </Text>
                            </View>
                        )
                    )}
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Mission Actions
                    </Text>

                    <Activity color={C.cyan} size={20} />
                </View>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={openAI}
                >
                    <BrainCircuit color={C.purple} size={22} />

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>
                            AI Care Assistant
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            Review simulated health guidance
                        </Text>
                    </View>

                    <ChevronRight color={C.purple} size={20} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={openAlerts}
                >
                    <BellRing color={C.yellow} size={22} />

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>
                            Mission Alert Center
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            Inspect active fictional health alerts
                        </Text>
                    </View>

                    <ChevronRight color={C.yellow} size={20} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={openHistory}
                >
                    <Database color={C.green} size={22} />

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>
                            Mission History
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            Explore saved crew telemetry
                        </Text>
                    </View>

                    <ChevronRight color={C.green} size={20} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.sampleButton}
                    onPress={addSample}
                >
                    <Radio color={C.cyan} size={19} />

                    <Text style={styles.sampleButtonText}>
                        Generate Crew Telemetry Sample
                    </Text>
                </TouchableOpacity>

                <View style={styles.statusRow}>
                    <Radio color={C.green} size={16} />

                    <Text style={styles.statusText}>
                        {historyLoaded
                            ? `${history.length} saved records · Tick ${tick}`
                            : 'Loading mission telemetry...'}
                    </Text>
                </View>

                <View style={styles.disclaimer}>
                    <Info color={C.cyan} size={20} />

                    <Text style={styles.disclaimerText}>
                        {selectedPrediction.disclaimer}
                        {'\n\n'}
                        Risk levels and health scores
                        are illustrative. They must not
                        be interpreted as real astronaut
                        medical assessments.
                    </Text>
                </View>

                <Text style={styles.footer}>
                    COSMIC CARE · MISSION CC-01
                    {'\n'}
                    PREDICTIVE CREW INTELLIGENCE
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
        marginBottom: 23,
    },
    headerButton: {
        width: 43,
        height: 43,
        borderRadius: 13,
        backgroundColor: C.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        marginLeft: 12,
    },
    brand: {
        color: C.cyan,
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    headerSubtitle: {
        color: C.muted,
        fontSize: 9,
        letterSpacing: 1,
        marginTop: 5,
    },
    alertDot: {
        position: 'absolute',
        right: 9,
        top: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: C.pink,
    },
    hero: {
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#285676',
        padding: 20,
        marginBottom: 25,
    },
    heroTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: '#194344',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    heroBadgeText: {
        color: C.green,
        fontSize: 9,
        fontWeight: '900',
    },
    heroMission: {
        color: C.cyan,
        fontSize: 9,
        fontWeight: '900',
    },
    heroIcon: {
        width: 68,
        height: 68,
        borderRadius: 20,
        backgroundColor: '#1B4A60',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 25,
        marginBottom: 18,
    },
    heroTitle: {
        color: C.white,
        fontSize: 25,
        fontWeight: '900',
    },
    heroDescription: {
        color: '#B9CFE0',
        fontSize: 12,
        lineHeight: 21,
        marginTop: 11,
    },
    heroDivider: {
        height: 1,
        backgroundColor: '#34536D',
        marginVertical: 20,
    },
    heroStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    heroStatValue: {
        color: C.white,
        fontSize: 22,
        fontWeight: '900',
    },
    heroStatLabel: {
        color: C.muted,
        fontSize: 9,
        marginTop: 7,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 14,
    },
    sectionTitle: {
        color: C.white,
        fontSize: 19,
        fontWeight: '900',
    },
    inlineLink: {
        color: C.cyan,
        fontSize: 12,
        fontWeight: '800',
    },
    cardEyebrow: {
        color: C.muted,
        fontSize: 10,
        fontWeight: '700',
    },
    missionCard: {
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 17,
        padding: 18,
        marginBottom: 24,
    },
    missionCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    missionRiskValue: {
        fontSize: 22,
        fontWeight: '900',
        marginTop: 9,
    },
    missionRiskIcon: {
        width: 47,
        height: 47,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    missionScoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 23,
        marginBottom: 17,
    },
    missionScoreLabel: {
        color: C.muted,
        fontSize: 9,
        marginBottom: 9,
    },
    missionScoreValue: {
        color: C.white,
        fontSize: 28,
        fontWeight: '900',
    },
    missionScoreMaximum: {
        color: C.muted,
        fontSize: 14,
    },
    missionSummary: {
        color: '#B8C8DB',
        fontSize: 12,
        lineHeight: 20,
    },
    sectionDescription: {
        color: C.muted,
        fontSize: 12,
        lineHeight: 20,
        marginBottom: 15,
    },
    comparisonCard: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 17,
        paddingHorizontal: 13,
        marginBottom: 24,
    },
    comparisonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    comparisonRowSelected: {
        backgroundColor: '#162B42',
    },
    comparisonAvatar: {
        width: 39,
        height: 39,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    comparisonInitials: {
        fontSize: 12,
        fontWeight: '900',
    },
    comparisonDetails: {
        flex: 1,
        marginLeft: 10,
    },
    comparisonName: {
        color: C.white,
        fontSize: 12,
        fontWeight: '800',
    },
    comparisonRole: {
        color: C.muted,
        fontSize: 10,
        marginTop: 5,
    },
    comparisonRight: {
        alignItems: 'flex-end',
        marginRight: 7,
    },
    comparisonScores: {
        color: C.white,
        fontSize: 12,
        fontWeight: '900',
    },
    comparisonRisk: {
        fontSize: 10,
        fontWeight: '800',
        marginTop: 6,
    },
    selectedCard: {
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 17,
        padding: 17,
        marginBottom: 24,
    },
    selectedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectedAvatar: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedInitials: {
        fontSize: 15,
        fontWeight: '900',
    },
    selectedIdentity: {
        flex: 1,
        marginLeft: 11,
    },
    selectedName: {
        color: C.white,
        fontSize: 14,
        fontWeight: '900',
    },
    selectedRole: {
        color: C.muted,
        fontSize: 10,
        marginTop: 5,
    },
    currentStatusBadge: {
        borderRadius: 9,
        paddingHorizontal: 9,
        paddingVertical: 7,
    },
    currentStatusText: {
        fontSize: 10,
        fontWeight: '900',
    },
    scoreComparison: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginTop: 26,
        marginBottom: 18,
    },
    scoreLabel: {
        color: C.muted,
        fontSize: 9,
        marginBottom: 9,
    },
    scoreValue: {
        color: C.white,
        fontSize: 31,
        fontWeight: '900',
    },
    scoreTrack: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#26384D',
        overflow: 'hidden',
    },
    scoreFill: {
        height: '100%',
        borderRadius: 4,
    },
    selectedRiskRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 18,
    },
    selectedRiskBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
    },
    selectedRiskText: {
        fontSize: 11,
        fontWeight: '900',
    },
    sampleCount: {
        color: C.muted,
        fontSize: 11,
    },
    scoreDifferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
    },
    scoreDifferenceText: {
        color: '#B8C8DB',
        fontSize: 11,
    },
    selectedSummary: {
        color: '#B8C8DB',
        fontSize: 12,
        lineHeight: 20,
        marginTop: 17,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        backgroundColor: C.cyan,
        borderRadius: 13,
        paddingVertical: 15,
        marginTop: 19,
    },
    primaryButtonText: {
        color: C.bg,
        fontSize: 12,
        fontWeight: '900',
    },
    vitalGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 17,
    },
    vitalMini: {
        width: '48%',
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        marginBottom: 11,
    },
    vitalMiniHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    vitalMiniLabel: {
        color: C.muted,
        fontSize: 11,
    },
    vitalMiniValue: {
        color: C.white,
        fontSize: 23,
        fontWeight: '900',
        marginTop: 13,
    },
    vitalMiniUnit: {
        color: C.muted,
        fontSize: 10,
    },
    forecastMetricCard: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        padding: 16,
        marginBottom: 13,
        overflow: 'hidden',
    },
    forecastMetricTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    forecastMetricIdentity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        flex: 1,
    },
    forecastMetricIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    forecastMetricTitle: {
        color: C.white,
        fontSize: 13,
        fontWeight: '900',
    },
    forecastTrendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    forecastTrendText: {
        fontSize: 10,
        fontWeight: '800',
    },
    forecastRiskBadge: {
        borderRadius: 9,
        paddingHorizontal: 9,
        paddingVertical: 7,
    },
    forecastRiskText: {
        fontSize: 9,
        fontWeight: '900',
    },
    forecastMetricValues: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginTop: 23,
        marginBottom: 10,
    },
    forecastValueLabel: {
        color: C.muted,
        fontSize: 9,
        marginBottom: 8,
    },
    forecastValue: {
        color: C.white,
        fontSize: 21,
        fontWeight: '900',
    },
    forecastUnit: {
        color: C.muted,
        fontSize: 10,
    },
    sparklineEmpty: {
        height: 55,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sparklineEmptyText: {
        color: C.dim,
        fontSize: 11,
    },
    forecastExplanation: {
        color: '#AFC0D6',
        fontSize: 11,
        lineHeight: 19,
        marginTop: 13,
    },
    showMoreButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 9,
        backgroundColor: '#15384B',
        borderRadius: 12,
        paddingVertical: 14,
        marginBottom: 23,
    },
    showMoreText: {
        color: C.cyan,
        fontSize: 12,
        fontWeight: '900',
    },
    insightsCard: {
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 17,
        marginBottom: 24,
    },
    insightRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 11,
        marginBottom: 14,
    },
    insightDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: C.purple,
        marginTop: 6,
    },
    insightText: {
        flex: 1,
        color: '#B8C8DB',
        fontSize: 12,
        lineHeight: 20,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 15,
        padding: 16,
        marginBottom: 11,
    },
    actionContent: {
        flex: 1,
        marginLeft: 13,
    },
    actionTitle: {
        color: C.white,
        fontSize: 13,
        fontWeight: '900',
    },
    actionSubtitle: {
        color: C.muted,
        fontSize: 11,
        marginTop: 5,
    },
    sampleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#17384D',
        borderRadius: 13,
        paddingVertical: 16,
        marginTop: 12,
        marginBottom: 19,
    },
    sampleButtonText: {
        color: C.cyan,
        fontSize: 12,
        fontWeight: '900',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginBottom: 20,
    },
    statusText: {
        color: C.muted,
        fontSize: 11,
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
        color: C.dim,
        fontSize: 9,
        textAlign: 'center',
        lineHeight: 18,
        marginTop: 27,
    },
});
